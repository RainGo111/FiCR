import React, { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Copy, Check } from 'lucide-react';

interface CodeBlockProps {
  code: string;
  language?: string;
  showLineNumbers?: boolean;
  title?: string;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({
  code,
  language = 'text',
  showLineNumbers = false,
  title
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative rounded-xl overflow-hidden shadow-film-soft border border-film-sand bg-film-grain-dark">
      {title && (
        <div className="bg-film-cream px-4 py-2 border-b border-film-sand flex justify-between items-center">
          <span className="text-sm font-mono font-medium text-film-charcoal">{title}</span>
          <button
            onClick={handleCopy}
            className="p-1.5 hover:bg-film-sand rounded-lg transition-film"
            aria-label="Copy code"
          >
            {copied ? (
              <Check className="w-4 h-4 text-accent-600" />
            ) : (
              <Copy className="w-4 h-4 text-film-slate" />
            )}
          </button>
        </div>
      )}
      {!title && (
        <button
          onClick={handleCopy}
          className="absolute top-2 right-2 p-2 bg-film-charcoal/90 hover:bg-film-charcoal rounded-lg transition-film z-10"
          aria-label="Copy code"
        >
          {copied ? (
            <Check className="w-4 h-4 text-accent-400" />
          ) : (
            <Copy className="w-4 h-4 text-film-paper" />
          )}
        </button>
      )}
      <SyntaxHighlighter
        language={language}
        style={tomorrow}
        showLineNumbers={showLineNumbers}
        customStyle={{
          margin: 0,
          padding: '1rem',
          fontSize: '0.875rem',
          background: '#2d2b28',
          fontFamily: 'SF Mono, Consolas, Monaco, Courier New, monospace'
        }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
};
