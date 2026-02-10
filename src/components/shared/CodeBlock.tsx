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
    <div className="relative rounded-xl overflow-hidden shadow-glass border border-white/20">
      {title && (
        <div className="glass px-4 py-2 border-b border-white/20 flex justify-between items-center">
          <span className="text-sm font-mono font-medium text-primary-900">{title}</span>
          <button
            onClick={handleCopy}
            className="p-1.5 hover:bg-white/50 rounded-lg transition-smooth"
            aria-label="Copy code"
          >
            {copied ? (
              <Check className="w-4 h-4 text-accent-600" />
            ) : (
              <Copy className="w-4 h-4 text-primary-600" />
            )}
          </button>
        </div>
      )}
      {!title && (
        <button
          onClick={handleCopy}
          className="absolute top-2 right-2 p-2 bg-primary-900/90 hover:bg-primary-800 rounded-lg transition-smooth z-10"
          aria-label="Copy code"
        >
          {copied ? (
            <Check className="w-4 h-4 text-accent-400" />
          ) : (
            <Copy className="w-4 h-4 text-white" />
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
          background: '#1e293b',
          fontFamily: 'SF Mono, Monaco, Consolas, Courier New, monospace'
        }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
};
