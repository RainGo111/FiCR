import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MessageSquare, Bot, RotateCcw, FileText, ArrowLeft } from 'lucide-react';
import { ChatMessage, ChatMessageData, ChatInput, StageInfo, PipelinePayload } from '../components/chatbot';
import { ReportDataView, MarkdownRenderer } from '../components/report';
import type { SparqlResults } from '../components/report/types';

/** Parse an SSE text stream into {event, data} objects */
function parseSSE(text: string): Array<{ event: string; data: string }> {
  const messages: Array<{ event: string; data: string }> = [];
  const blocks = text.split('\n\n');
  for (const block of blocks) {
    if (!block.trim()) continue;
    let event = 'message';
    let data = '';
    for (const line of block.split('\n')) {
      if (line.startsWith('event: ')) event = line.slice(7);
      else if (line.startsWith('data: ')) data = line.slice(6);
    }
    if (data) messages.push({ event, data });
  }
  return messages;
}

const WELCOME_MESSAGE: ChatMessageData = {
  id: 'welcome',
  role: 'assistant',
  content: 'Welcome to FiCR Agent. Upload or paste a building survey JSON, or describe a building in natural language to begin fire compliance and risk analysis. The pipeline will validate your data, build an RDF knowledge graph, run SPARQL compliance queries, and generate a detailed report.\n\nYou can switch between **JSON** and **Describe** modes using the toggle in the toolbar below.',
  timestamp: new Date(),
};

export const Chatbot: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessageData[]>([WELCOME_MESSAGE]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [agentSparqlResults, setAgentSparqlResults] = useState<SparqlResults | null>(null);
  const [llmNarrative, setLlmNarrative] = useState('');
  const llmNarrativeRef = useRef('');
  const [showReport, setShowReport] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const isFirstRender = useRef(true);

  const isNearBottom = useCallback(() => {
    const el = chatContainerRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 100;
  }, []);

  const scrollToBottom = useCallback(() => {
    const el = chatContainerRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, []);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (isNearBottom()) {
      scrollToBottom();
    }
  }, [messages, scrollToBottom, isNearBottom]);

  const handleNewAnalysis = useCallback(() => {
    if (isProcessing) {
      abortRef.current?.abort();
    }
    setMessages([WELCOME_MESSAGE]);
    setSessionId(null);
    setIsProcessing(false);
    setAgentSparqlResults(null);
    setLlmNarrative('');
    llmNarrativeRef.current = '';
    setShowReport(false);
    abortRef.current = null;
  }, [isProcessing]);

  /** Read SSE stream and dispatch events to updater callbacks */
  const readSSEStream = useCallback(async (
    response: Response,
    onEvent: (event: string, parsed: Record<string, any>) => void,
  ) => {
    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split('\n\n');
      buffer = parts.pop() || '';

      for (const part of parts) {
        if (!part.trim()) continue;
        const events = parseSSE(part + '\n\n');
        for (const { event, data } of events) {
          try {
            onEvent(event, JSON.parse(data));
          } catch {
            // skip malformed JSON
          }
        }
      }
    }
  }, []);

  const handleSubmit = useCallback(async (payload: PipelinePayload) => {
    if (isProcessing) return;
    setIsProcessing(true);

    const controller = new AbortController();
    abortRef.current = controller;

    // ── Conversation follow-up ──────────────────────────────────
    if (payload.mode === 'conversation' && sessionId) {
      const userMsg: ChatMessageData = {
        id: `user-${Date.now()}`,
        role: 'user',
        title: payload.message,
        content: '',
        timestamp: new Date(),
      };

      const assistantId = `assistant-${Date.now()}`;
      const assistantMsg: ChatMessageData = {
        id: assistantId,
        role: 'assistant',
        content: '',
        isStreaming: true,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, userMsg, assistantMsg]);

      const updateAssistant = (updater: (msg: ChatMessageData) => ChatMessageData) => {
        setMessages(prev =>
          prev.map(m => m.id === assistantId ? updater({ ...m }) : m)
        );
      };

      try {
        const response = await fetch('/api/chatbot/conversation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_id: sessionId,
            message: payload.message,
            provider: payload.provider,
            model: payload.model,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Server error ${response.status}: ${await response.text()}`);
        }

        await readSSEStream(response, (event, parsed) => {
          switch (event) {
            case 'session':
              setSessionId(parsed.session_id);
              break;

            case 'intent':
              // Could display intent badge in the future
              break;

            case 'report_chunk':
              updateAssistant(msg => ({
                ...msg,
                content: msg.content + (parsed.text || ''),
              }));
              break;

            case 'report_done':
              updateAssistant(msg => ({ ...msg, isStreaming: false }));
              break;

            // If the conversation triggers a new pipeline run (e.g., modify_survey)
            case 'validation':
            case 'rdf':
            case 'sparql':
            case 'report_start':
              // Pipeline events from conversation — add stages dynamically
              if (event === 'validation' && parsed.status === 'pass') {
                updateAssistant(msg => ({
                  ...msg,
                  stages: [
                    { id: 'validate', label: 'Validate Survey JSON', status: 'complete' as const, detail: 'Schema valid' },
                    { id: 'rdf', label: 'Build RDF Knowledge Graph', status: 'running' as const },
                    { id: 'sparql', label: 'Run SPARQL Queries', status: 'pending' as const },
                    { id: 'report', label: 'Generate Report', status: 'pending' as const },
                  ],
                }));
              }
              break;

            case 'error':
              updateAssistant(msg => ({
                ...msg,
                isStreaming: false,
                content: msg.content || `Error: ${parsed.message}`,
              }));
              break;

            case 'done':
              updateAssistant(msg => ({ ...msg, isStreaming: false }));
              break;
          }
        });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          updateAssistant(msg => ({
            ...msg,
            isStreaming: false,
            content: msg.content || `Connection error: ${(err as Error).message}`,
          }));
        }
      } finally {
        setIsProcessing(false);
        abortRef.current = null;
      }
      return;
    }

    // ── Initial pipeline (JSON or NL mode) ──────────────────────
    const isNL = payload.mode === 'nl';

    const userMsg: ChatMessageData = {
      id: `user-${Date.now()}`,
      role: 'user',
      title: isNL
        ? 'Building Description'
        : (() => {
            const s = (payload as any).survey as Record<string, any>;
            return s?.meta?.building_name || s?.building?.label || s?.meta?.project_slug || 'Building Survey';
          })(),
      content: isNL
        ? (payload as any).description
        : JSON.stringify((payload as any).survey, null, 2),
      timestamp: new Date(),
    };

    const assistantId = `assistant-${Date.now()}`;
    const initialStages: StageInfo[] = isNL
      ? [
          { id: 'llm1', label: 'Generate Survey JSON (LLM)', status: 'pending' },
          { id: 'validate', label: 'Validate Survey JSON', status: 'pending' },
          { id: 'rdf', label: 'Build RDF Knowledge Graph', status: 'pending' },
          { id: 'sparql', label: 'Run SPARQL Queries', status: 'pending' },
          { id: 'report', label: 'Generate Report', status: 'pending' },
        ]
      : [
          { id: 'validate', label: 'Validate Survey JSON', status: 'pending' },
          { id: 'rdf', label: 'Build RDF Knowledge Graph', status: 'pending' },
          { id: 'sparql', label: 'Run SPARQL Queries', status: 'pending' },
          { id: 'report', label: 'Generate Report', status: 'pending' },
        ];

    const assistantMsg: ChatMessageData = {
      id: assistantId,
      role: 'assistant',
      content: '',
      stages: [...initialStages],
      isStreaming: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg, assistantMsg]);

    const updateAssistant = (updater: (msg: ChatMessageData) => ChatMessageData) => {
      setMessages(prev =>
        prev.map(m => m.id === assistantId ? updater({ ...m }) : m)
      );
    };

    const updateStage = (stageId: string, updates: Partial<StageInfo>) => {
      updateAssistant(msg => ({
        ...msg,
        stages: msg.stages?.map(s =>
          s.id === stageId ? { ...s, ...updates } : s
        ),
      }));
    };

    try {
      const endpoint = isNL ? '/api/chatbot/run-nl-pipeline' : '/api/chatbot/run-pipeline';
      const body = isNL
        ? { description: (payload as any).description, provider: payload.provider, model: payload.model }
        : { survey: (payload as any).survey, provider: payload.provider, model: payload.model };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Server error ${response.status}: ${errText}`);
      }

      await readSSEStream(response, (event, parsed) => {
        switch (event) {
          case 'session':
            setSessionId(parsed.session_id);
            break;

          // NL mode: LLM#1 survey generation
          case 'llm1_start':
            updateStage('llm1', { status: 'running', detail: `${parsed.provider}/${parsed.model}` });
            break;

          case 'llm1_done':
            if (parsed.status === 'ok') {
              updateStage('llm1', { status: 'complete', detail: 'Survey JSON generated' });
              updateStage('validate', { status: 'running' });
            } else {
              updateStage('llm1', { status: 'error', detail: parsed.message || 'Generation failed' });
            }
            break;

          // Standard pipeline events
          case 'validation':
            if (parsed.status === 'pass') {
              updateStage('validate', { status: 'complete', detail: 'Schema valid' });
              updateStage('rdf', { status: 'running' });
            } else {
              updateStage('validate', {
                status: 'error',
                detail: `${parsed.errors?.length || 0} errors`,
              });
            }
            break;

          case 'rdf':
            updateStage('rdf', {
              status: 'complete',
              detail: `${parsed.triple_count?.toLocaleString()} triples`,
            });
            updateStage('sparql', { status: 'running' });
            break;

          case 'sparql':
            updateStage('sparql', {
              status: 'complete',
              detail: `${parsed.query_count} queries executed`,
            });
            updateAssistant(msg => ({
              ...msg,
              sparqlSummary: {
                totalTriples: parsed.total_triples,
                queryCount: parsed.query_count,
                probesFailed: parsed.probes_failed || [],
              },
            }));
            // Capture full SPARQL results for report view
            if (parsed.results?.results) {
              setAgentSparqlResults(parsed.results.results as SparqlResults);
            }
            llmNarrativeRef.current = '';
            updateStage('report', { status: 'running' });
            break;

          case 'report_start':
            break;

          case 'report_chunk':
            llmNarrativeRef.current += (parsed.text || '');
            updateAssistant(msg => ({
              ...msg,
              content: msg.content + (parsed.text || ''),
            }));
            break;

          case 'report_done':
            updateStage('report', {
              status: 'complete',
              detail: `${parsed.char_count?.toLocaleString()} chars`,
            });
            setLlmNarrative(llmNarrativeRef.current);
            updateAssistant(msg => ({
              ...msg,
              isStreaming: false,
            }));
            break;

          case 'error':
            updateStage(parsed.stage || 'validate', {
              status: 'error',
              detail: parsed.message,
            });
            updateAssistant(msg => ({
              ...msg,
              isStreaming: false,
              content: msg.content || `Error at ${parsed.stage}: ${parsed.message}`,
            }));
            break;

          case 'done':
            updateAssistant(msg => ({
              ...msg,
              isStreaming: false,
            }));
            break;
        }
      });
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        updateAssistant(msg => ({
          ...msg,
          isStreaming: false,
          content: msg.content || `Connection error: ${(err as Error).message}`,
          stages: msg.stages?.map(s =>
            s.status === 'running' ? { ...s, status: 'error' as const, detail: 'Connection lost' } : s
          ),
        }));
      }
    } finally {
      setIsProcessing(false);
      abortRef.current = null;
    }
  }, [isProcessing, sessionId, readSSEStream]);

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200 bg-white">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <div className="bg-slate-800 p-2.5 rounded-lg shadow-sm">
            <MessageSquare className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-slate-900">FiCR Agent</h1>
            <p className="text-xs text-slate-500">Fire Compliance and Risk Analysis Agent</p>
          </div>
          {/* New Analysis button — visible when session exists */}
          {sessionId && (
            <button
              onClick={handleNewAnalysis}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-md hover:bg-slate-100 hover:border-slate-300 transition-smooth"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              New Analysis
            </button>
          )}
        </div>
      </div>

      {/* Messages area */}
      <div ref={chatContainerRef} className="flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-4xl mx-auto">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="bg-slate-100 p-6 rounded-full mb-6">
                <Bot className="w-12 h-12 text-slate-400" />
              </div>
              <h2 className="text-xl font-semibold text-slate-700 mb-2">
                FiCR Fire Compliance Analysis
              </h2>
              <p className="text-slate-500 max-w-md">
                Upload a building survey JSON or describe a building to analyze fire compliance.
                The system will validate, build a knowledge graph, run SPARQL queries,
                and generate a detailed report.
              </p>
            </div>
          ) : (
            messages.map(msg => (
              <ChatMessage key={msg.id} message={msg} />
            ))
          )}
          {/* View Full Report button — appears after pipeline completes */}
          {agentSparqlResults && !isProcessing && !showReport && (
            <div className="flex justify-center mt-6 mb-4">
              <button
                onClick={() => setShowReport(true)}
                className="px-6 py-3 bg-primary-600 text-white rounded-md hover:bg-primary-700 font-semibold shadow-sm transition-smooth flex items-center gap-2"
              >
                <FileText size={18} />
                View Full Report
              </button>
            </div>
          )}

          {/* Report panel — inline below chat */}
          {showReport && agentSparqlResults && (
            <div className="mt-8 border-t-2 border-slate-200 pt-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-slate-900">Compliance Report</h2>
                <button
                  onClick={() => setShowReport(false)}
                  className="text-slate-500 hover:text-slate-700 flex items-center gap-1 text-sm"
                >
                  <ArrowLeft size={14} />
                  Back to chat
                </button>
              </div>

              <ReportDataView results={agentSparqlResults} />

              {llmNarrative && (
                <div className="mt-10 border-t-2 border-slate-200 pt-8">
                  <h2 className="text-xl font-bold text-slate-900 mb-6">
                    AI Analysis & Recommendations
                  </h2>
                  <div className="prose prose-neutral max-w-none">
                    <MarkdownRenderer text={llmNarrative} />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Input */}
      <div className="max-w-4xl mx-auto w-full">
        <ChatInput
          onSubmit={handleSubmit}
          disabled={isProcessing}
          hasSession={!!sessionId}
        />
      </div>
    </div>
  );
};
