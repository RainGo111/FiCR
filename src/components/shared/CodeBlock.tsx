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
    <div className="relative rounded-xl overflow-hidden shadow-soft border border-neutral-200">
      {title && (
        <div className="bg-neutral-100 px-4 py-2 border-b border-neutral-200 flex justify-between items-center">
          <span className="text-sm font-medium text-neutral-700">{title}</span>
          <button
            onClick={handleCopy}
            className="p-1.5 hover:bg-neutral-200 rounded-lg transition-colors duration-200"
            aria-label="Copy code"
          >
            {copied ? (
              <Check className="w-4 h-4 text-secondary-600" />
            ) : (
              <Copy className="w-4 h-4 text-neutral-600" />
            )}
          </button>
        </div>
      )}
      {!title && (
        <button
          onClick={handleCopy}
          className="absolute top-2 right-2 p-2 bg-neutral-800/80 hover:bg-neutral-700 rounded-lg transition-colors duration-200 z-10"
          aria-label="Copy code"
        >
          {copied ? (
            <Check className="w-4 h-4 text-secondary-400" />
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
          background: '#1e1e1e'
        }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
};
