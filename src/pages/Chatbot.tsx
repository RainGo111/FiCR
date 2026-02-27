import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MessageSquare, Bot } from 'lucide-react';
import { ChatMessage, ChatMessageData, ChatInput, StageInfo } from '../components/chatbot';

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
  content: 'Welcome to FiCR Chatbot. Upload or paste a building survey JSON file to begin fire compliance analysis. The pipeline will validate your data, build an RDF knowledge graph, run SPARQL compliance queries, and generate a detailed report.',
  timestamp: new Date(),
};

export const Chatbot: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessageData[]>([WELCOME_MESSAGE]);
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSubmit = useCallback(async (survey: object, provider: string, model: string) => {
    if (isProcessing) return;
    setIsProcessing(true);

    const surveyAny = survey as Record<string, any>;
    const buildingName = surveyAny?.meta?.building_name
      || surveyAny?.building?.label
      || surveyAny?.meta?.project_slug
      || 'Building Survey';

    // Add user message
    const userMsg: ChatMessageData = {
      id: `user-${Date.now()}`,
      role: 'user',
      title: `Uploaded: ${buildingName}`,
      content: JSON.stringify(survey, null, 2),
      timestamp: new Date(),
    };

    const assistantId = `assistant-${Date.now()}`;
    const initialStages: StageInfo[] = [
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

    // Helper to update the assistant message in-place
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

    // Start SSE request
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch('/api/chatbot/run-pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ survey, provider, model }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Server error ${response.status}: ${errText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process complete SSE messages (delimited by \n\n)
        const parts = buffer.split('\n\n');
        buffer = parts.pop() || ''; // Keep incomplete last part

        for (const part of parts) {
          if (!part.trim()) continue;
          const events = parseSSE(part + '\n\n');

          for (const { event, data } of events) {
            let parsed: Record<string, any>;
            try {
              parsed = JSON.parse(data);
            } catch {
              continue;
            }

            switch (event) {
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
                updateStage('report', { status: 'running' });
                break;

              case 'report_start':
                // Already set to running above
                break;

              case 'report_chunk':
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
          }
        }
      }
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
  }, [isProcessing]);

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="px-6 py-4 border-b border-neutral-200 bg-white/60 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <div className="bg-gradient-to-br from-neutral-700 to-neutral-900 p-2.5 rounded-xl shadow-medium">
            <MessageSquare className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-neutral-900">FiCR Chatbot</h1>
            <p className="text-xs text-neutral-500">Fire Compliance Analysis Pipeline</p>
          </div>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-4xl mx-auto">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="bg-neutral-100 p-6 rounded-full mb-6">
                <Bot className="w-12 h-12 text-neutral-400" />
              </div>
              <h2 className="text-xl font-semibold text-neutral-700 mb-2">
                FiCR Fire Compliance Analysis
              </h2>
              <p className="text-neutral-500 max-w-md">
                Upload a building survey JSON to analyze fire compliance.
                The system will validate, build a knowledge graph, run SPARQL queries,
                and generate a detailed report.
              </p>
            </div>
          ) : (
            messages.map(msg => (
              <ChatMessage key={msg.id} message={msg} />
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="max-w-4xl mx-auto w-full">
        <ChatInput onSubmit={handleSubmit} disabled={isProcessing} />
      </div>
    </div>
  );
};
