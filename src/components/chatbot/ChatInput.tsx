import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Upload,
  Loader2,
  ChevronDown,
  FileJson2,
  Sparkles,
} from 'lucide-react';

interface LLMProvider {
  id: string;
  label: string;
  models: string[];
  default_model: string;
}

interface SampleSurvey {
  slug: string;
  building_name: string;
  filename: string;
}

interface ChatInputProps {
  onSubmit: (survey: object, provider: string, model: string) => void;
  disabled: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSubmit, disabled }) => {
  const [jsonText, setJsonText] = useState('');
  const [providers, setProviders] = useState<LLMProvider[]>([]);
  const [samples, setSamples] = useState<SampleSurvey[]>([]);
  const [selectedProvider, setSelectedProvider] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [showProviderDropdown, setShowProviderDropdown] = useState(false);
  const [showSampleDropdown, setShowSampleDropdown] = useState(false);
  const [loadingSample, setLoadingSample] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Fetch providers and samples on mount
  useEffect(() => {
    fetch('/api/chatbot/providers')
      .then(r => r.json())
      .then((data: LLMProvider[]) => {
        setProviders(data);
        if (data.length > 0) {
          setSelectedProvider(data[0].id);
          setSelectedModel(data[0].default_model);
        }
      })
      .catch(() => {
        // Fallback if server not running
        setProviders([]);
      });

    fetch('/api/chatbot/sample-surveys')
      .then(r => r.json())
      .then((data: SampleSurvey[]) => setSamples(data))
      .catch(() => setSamples([]));
  }, []);

  const currentProvider = providers.find(p => p.id === selectedProvider);

  const handleProviderChange = (pid: string) => {
    const prov = providers.find(p => p.id === pid);
    setSelectedProvider(pid);
    if (prov) setSelectedModel(prov.default_model);
    setShowProviderDropdown(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setJsonText(text);
      setParseError(null);
      try {
        JSON.parse(text);
      } catch {
        setParseError('Invalid JSON file');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleLoadSample = async (slug: string) => {
    setShowSampleDropdown(false);
    setLoadingSample(true);
    try {
      const resp = await fetch(`/api/chatbot/sample-surveys/${slug}`);
      const data = await resp.json();
      const text = JSON.stringify(data, null, 2);
      setJsonText(text);
      setParseError(null);
    } catch {
      setParseError(`Failed to load sample "${slug}"`);
    }
    setLoadingSample(false);
  };

  const handleSubmit = () => {
    if (!jsonText.trim() || disabled) return;
    setParseError(null);
    try {
      const survey = JSON.parse(jsonText);
      onSubmit(survey, selectedProvider, selectedModel);
      setJsonText('');
    } catch {
      setParseError('Invalid JSON — please check your input');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="border-t border-neutral-200 bg-white/80 backdrop-blur-md">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-neutral-100">
        {/* Sample loader */}
        <div className="relative">
          <button
            onClick={() => setShowSampleDropdown(!showSampleDropdown)}
            disabled={disabled || loadingSample}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-600 bg-neutral-50 border border-neutral-200 rounded-lg hover:bg-neutral-100 hover:border-neutral-300 transition-all disabled:opacity-50"
          >
            {loadingSample ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <FileJson2 className="w-3.5 h-3.5" />
            )}
            Samples
            <ChevronDown className="w-3 h-3" />
          </button>
          {showSampleDropdown && samples.length > 0 && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowSampleDropdown(false)} />
              <div className="absolute bottom-full mb-1 left-0 w-56 bg-white border border-neutral-200 rounded-xl shadow-xl z-50 overflow-hidden">
                <div className="px-3 py-2 text-xs font-semibold text-neutral-400 uppercase tracking-wider bg-neutral-50 border-b border-neutral-100">
                  Load Sample Survey
                </div>
                {samples.map(s => (
                  <button
                    key={s.slug}
                    onClick={() => handleLoadSample(s.slug)}
                    className="w-full text-left px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors border-b border-neutral-50 last:border-0"
                  >
                    <div className="font-medium">{s.building_name}</div>
                    <div className="text-xs text-neutral-400 mt-0.5">{s.filename}</div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* File upload */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-600 bg-neutral-50 border border-neutral-200 rounded-lg hover:bg-neutral-100 hover:border-neutral-300 transition-all disabled:opacity-50"
        >
          <Upload className="w-3.5 h-3.5" />
          Upload JSON
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileUpload}
          className="hidden"
        />

        <div className="flex-1" />

        {/* Provider selector */}
        {providers.length > 0 && (
          <div className="relative">
            <button
              onClick={() => setShowProviderDropdown(!showProviderDropdown)}
              disabled={disabled}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-600 bg-neutral-50 border border-neutral-200 rounded-lg hover:bg-neutral-100 hover:border-neutral-300 transition-all disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {currentProvider?.label || 'Select LLM'}
              <span className="text-neutral-400 ml-1">/ {selectedModel}</span>
              <ChevronDown className="w-3 h-3" />
            </button>
            {showProviderDropdown && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowProviderDropdown(false)} />
                <div className="absolute bottom-full mb-1 right-0 w-72 bg-white border border-neutral-200 rounded-xl shadow-xl z-50 overflow-hidden">
                  <div className="px-3 py-2 text-xs font-semibold text-neutral-400 uppercase tracking-wider bg-neutral-50 border-b border-neutral-100">
                    LLM Provider & Model
                  </div>
                  {providers.map(p => (
                    <div key={p.id} className="border-b border-neutral-100 last:border-0">
                      <div className="px-4 py-2 text-xs font-bold text-neutral-500 bg-neutral-25">
                        {p.label}
                      </div>
                      {p.models.map(m => (
                        <button
                          key={m}
                          onClick={() => { handleProviderChange(p.id); setSelectedModel(m); setShowProviderDropdown(false); }}
                          className={`w-full text-left px-6 py-2 text-sm transition-colors ${
                            selectedProvider === p.id && selectedModel === m
                              ? 'bg-primary-50 text-primary-700 font-medium'
                              : 'text-neutral-600 hover:bg-neutral-50'
                          }`}
                        >
                          {m}
                          {m === p.default_model && (
                            <span className="ml-2 text-xs text-neutral-400">(default)</span>
                          )}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="px-4 py-3">
        {parseError && (
          <div className="mb-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">
            {parseError}
          </div>
        )}
        <div className="flex items-end gap-3">
          <textarea
            ref={textareaRef}
            value={jsonText}
            onChange={e => { setJsonText(e.target.value); setParseError(null); }}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            placeholder="Paste your survey JSON here, or use the toolbar above to load a sample..."
            className="flex-1 min-h-[60px] max-h-[200px] p-3 text-sm font-mono bg-neutral-50 border border-neutral-200 rounded-xl resize-y focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-300 transition-all disabled:opacity-50 placeholder:text-neutral-400"
            rows={3}
          />
          <button
            onClick={handleSubmit}
            disabled={disabled || !jsonText.trim()}
            className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white text-sm font-medium rounded-xl hover:shadow-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95 shrink-0"
          >
            {disabled ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            {disabled ? 'Processing...' : 'Analyze'}
          </button>
        </div>
        <div className="mt-1.5 text-xs text-neutral-400 text-right">
          Ctrl + Enter to send
        </div>
      </div>
    </div>
  );
};
