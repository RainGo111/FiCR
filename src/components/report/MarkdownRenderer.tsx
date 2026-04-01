import React from 'react';

/** Simple markdown renderer for headings, bullets, bold, tables, numbered lists */
export const MarkdownRenderer: React.FC<{ text: string }> = ({ text }) => {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Heading ##
    if (line.startsWith('## ')) {
      elements.push(
        <h2 key={i} className="text-lg font-bold text-neutral-900 mt-5 mb-2 first:mt-0">{line.slice(3)}</h2>
      );
    } else if (line.startsWith('### ')) {
      elements.push(
        <h3 key={i} className="text-base font-semibold text-neutral-800 mt-4 mb-1">{line.slice(4)}</h3>
      );
    } else if (line.startsWith('# ')) {
      elements.push(
        <h1 key={i} className="text-xl font-bold text-neutral-900 mt-5 mb-2 first:mt-0">{line.slice(2)}</h1>
      );
    }
    // Table
    else if (line.includes('|') && i + 1 < lines.length && lines[i + 1]?.match(/^\|[\s-:|]+\|$/)) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].includes('|')) {
        tableLines.push(lines[i]);
        i++;
      }
      i--;
      const headers = tableLines[0].split('|').filter(c => c.trim()).map(c => c.trim());
      const rows = tableLines.slice(2).map(r => r.split('|').filter(c => c.trim()).map(c => c.trim()));
      elements.push(
        <div key={i} className="overflow-x-auto my-3">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr>
                {headers.map((h, hi) => (
                  <th key={hi} className="px-3 py-2 text-left font-semibold text-neutral-700 border-b-2 border-neutral-200 bg-neutral-50">{h}</th>
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
    // Numbered list
    else if (line.match(/^\s*\d+\.\s/)) {
      const items: string[] = [];
      while (i < lines.length && lines[i].match(/^\s*\d+\.\s/)) {
        items.push(lines[i].replace(/^\s*\d+\.\s/, ''));
        i++;
      }
      i--;
      elements.push(
        <ol key={i} className="list-decimal list-inside space-y-1 my-2 text-neutral-700 text-sm">
          {items.map((item, idx) => (
            <li key={idx} dangerouslySetInnerHTML={{
              __html: item
                .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                .replace(/`(.+?)`/g, '<code class="bg-neutral-100 px-1 py-0.5 rounded text-xs font-mono">$1</code>')
            }} />
          ))}
        </ol>
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
