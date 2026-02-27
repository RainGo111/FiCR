import React, { useState } from 'react';
import { Bot, User, ChevronDown, ChevronRight, Download } from 'lucide-react';
import { PipelineProgress, StageInfo } from './PipelineProgress';
import { CodeBlock } from '../shared';

export interface ChatMessageData {
  id: string;
  role: 'user' | 'assistant';
  /** For user messages: the building name or summary */
  title?: string;
  /** Raw survey JSON (user messages) or report markdown (assistant) */
  content: string;
  /** Pipeline stage progress (assistant messages only) */
  stages?: StageInfo[];
  /** SPARQL results summary (assistant messages only) */
  sparqlSummary?: {
    totalTriples: number;
    queryCount: number;
    probesFailed: string[];
  };
  /** Whether the report is still streaming */
  isStreaming?: boolean;
  /** Timestamp */
  timestamp: Date;
}

interface ChatMessageProps {
  message: ChatMessageData;
}

/** Simple markdown renderer for headings, bullets, bold, tables */
const MarkdownRenderer: React.FC<{ text: string }> = ({ text }) => {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Heading ##
    if (line.startsWith('## ')) {
      elements.push(
        <h2 key={i} className="text-lg font-bold text-neutral-900 mt-5 mb-2 first:mt-0">
          {line.slice(3)}
        </h2>
      );
    } else if (line.startsWith('### ')) {
      elements.push(
        <h3 key={i} className="text-base font-semibold text-neutral-800 mt-4 mb-1">
          {line.slice(4)}
        </h3>
      );
    } else if (line.startsWith('# ')) {
      elements.push(
        <h1 key={i} className="text-xl font-bold text-neutral-900 mt-5 mb-2 first:mt-0">
          {line.slice(2)}
        </h1>
      );
    }
    // Table (detect |---|)
    else if (line.includes('|') && i + 1 < lines.length && lines[i + 1]?.match(/^\|[\s-:|]+\|$/)) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].includes('|')) {
        tableLines.push(lines[i]);
        i++;
      }
      i--; // will be incremented at loop end

      const headers = tableLines[0].split('|').filter(c => c.trim()).map(c => c.trim());
      const rows = tableLines.slice(2).map(r =>
        r.split('|').filter(c => c.trim()).map(c => c.trim())
      );

      elements.push(
        <div key={i} className="overflow-x-auto my-3">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr>
                {headers.map((h, hi) => (
                  <th key={hi} className="px-3 py-2 text-left font-semibold text-neutral-700 border-b-2 border-neutral-200 bg-neutral-50">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => (
                <tr key={ri} className="border-b border-neutral-100">
                  {row.map((cell, ci) => (
                    <td key={ci} className="px-3 py-1.5 text-neutral-600">{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    // Bullet list
    else if (line.match(/^\s*[-*]\s/)) {
      const items: string[] = [];
      while (i < lines.length && lines[i].match(/^\s*[-*]\s/)) {
        items.push(lines[i].replace(/^\s*[-*]\s/, ''));
        i++;
      }
      i--;
      elements.push(
        <ul key={i} className="list-disc list-inside space-y-1 my-2 text-neutral-700 text-sm">
          {items.map((item, idx) => (
            <li key={idx} dangerouslySetInnerHTML={{
              __html: item
                .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                .replace(/`(.+?)`/g, '<code class="bg-neutral-100 px-1 py-0.5 rounded text-xs font-mono">$1</code>')
            }} />
          ))}
        </ul>
      );
    }
    // Empty line
    else if (line.trim() === '') {
      // skip
    }
    // Regular paragraph
    else {
      elements.push(
        <p key={i} className="text-sm text-neutral-700 my-1 leading-relaxed" dangerouslySetInnerHTML={{
          __html: line
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/`(.+?)`/g, '<code class="bg-neutral-100 px-1 py-0.5 rounded text-xs font-mono">$1</code>')
        }} />
      );
    }
    i++;
  }

  return <div>{elements}</div>;
};

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const [jsonExpanded, setJsonExpanded] = useState(false);
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <div className="flex justify-end mb-4">
        <div className="flex items-start gap-3 max-w-[80%]">
          <div className="bg-gradient-to-br from-[#667eea] to-[#764ba2] rounded-2xl rounded-tr-sm px-5 py-3 shadow-soft">
            <p className="text-white font-medium text-sm">
              {message.title || 'Survey uploaded'}
            </p>
            {message.content && (
              <div className="mt-2">
                <button
                  onClick={() => setJsonExpanded(!jsonExpanded)}
                  className="flex items-center gap-1 text-white/70 hover:text-white text-xs transition-smooth"
                >
                  {jsonExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                  View JSON
                </button>
                {jsonExpanded && (
                  <div className="mt-2 max-h-60 overflow-auto rounded-lg">
                    <CodeBlock
                      code={message.content.length > 2000
                        ? message.content.slice(0, 2000) + '\n... (truncated)'
                        : message.content}
                      language="json"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="bg-gradient-to-br from-[#667eea] to-[#764ba2] p-2 rounded-full shrink-0 shadow-soft">
            <User className="w-4 h-4 text-white" />
          </div>
        </div>
      </div>
    );
  }

  // Assistant message
  return (
    <div className="flex justify-start mb-4">
      <div className="flex items-start gap-3 max-w-[85%]">
        <div className="bg-gradient-to-br from-neutral-700 to-neutral-900 p-2 rounded-full shrink-0 shadow-soft">
          <Bot className="w-4 h-4 text-white" />
        </div>
        <div className="glass rounded-2xl rounded-tl-sm px-5 py-4 shadow-glass border border-white/20 min-w-[300px]">
          {/* Pipeline progress */}
          {message.stages && message.stages.length > 0 && (
            <div className="mb-4">
              <PipelineProgress stages={message.stages} />
            </div>
          )}

          {/* SPARQL summary */}
          {message.sparqlSummary && (
            <div className="flex gap-3 mb-4 flex-wrap">
              <div className="px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg text-xs">
                <span className="font-bold text-blue-700">{message.sparqlSummary.totalTriples.toLocaleString()}</span>
                <span className="text-blue-500 ml-1">triples</span>
              </div>
              <div className="px-3 py-1.5 bg-purple-50 border border-purple-200 rounded-lg text-xs">
                <span className="font-bold text-purple-700">{message.sparqlSummary.queryCount}</span>
                <span className="text-purple-500 ml-1">queries</span>
              </div>
              {message.sparqlSummary.probesFailed.length > 0 && (
                <div className="px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg text-xs">
                  <span className="font-bold text-amber-700">{message.sparqlSummary.probesFailed.length}</span>
                  <span className="text-amber-500 ml-1">probe warnings</span>
                </div>
              )}
            </div>
          )}

          {/* Report content */}
          {message.content && (
            <div className="prose prose-sm max-w-none">
              <MarkdownRenderer text={message.content} />
            </div>
          )}

          {/* Streaming cursor */}
          {message.isStreaming && (
            <span className="inline-block w-2 h-4 bg-neutral-400 animate-pulse ml-0.5 align-text-bottom" />
          )}

          {/* Download report button */}
          {!message.isStreaming && message.content && message.stages && (
            <div className="mt-4 pt-3 border-t border-neutral-200/60">
              <button
                onClick={() => {
                  const blob = new Blob([message.content], { type: 'text/markdown;charset=utf-8' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `ficr-report-${new Date().toISOString().slice(0, 10)}.md`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-neutral-600 bg-neutral-50 border border-neutral-200 rounded-lg hover:bg-neutral-100 hover:border-neutral-300 hover:text-neutral-800 transition-all active:scale-95"
              >
                <Download className="w-4 h-4" />
                Download Report (.md)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
