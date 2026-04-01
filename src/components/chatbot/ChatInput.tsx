import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Upload,
  Loader2,
  ChevronDown,
  FileJson2,
  FileText,
  Sparkles,
  MessageSquare,
} from 'lucide-react';

export type PipelinePayload =
  | { mode: 'json'; survey: object; provider: string; model: string }
  | { mode: 'nl'; description: string; provider: string; model: string }
  | { mode: 'conversation'; message: string; provider: string; model: string };

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

interface MarkdownSample {
  name: string;
  filename: string;
  label: string;
  tag: string;
}

interface ChatInputProps {
  onSubmit: (payload: PipelinePayload) => void;
  disabled: boolean;
  hasSession?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSubmit, disabled, hasSession = false }) => {
  const [inputText, setInputText] = useState('');
  const [inputMode, setInputMode] = useState<'json' | 'nl' | 'md'>('json');
  const [providers, setProviders] = useState<LLMProvider[]>([]);
  const [samples, setSamples] = useState<SampleSurvey[]>([]);
  const [mdSamples, setMdSamples] = useState<MarkdownSample[]>([]);
  const [selectedProvider, setSelectedProvider] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [showProviderDropdown, setShowProviderDropdown] = useState(false);
  const [showSampleDropdown, setShowSampleDropdown] = useState(false);
  const [showMdSampleDropdown, setShowMdSampleDropdown] = useState(false);
  const [loadingSample, setLoadingSample] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mdFileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Fetch providers, JSON samples, and MD samples on mount
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
        setProviders([]);
      });

    fetch('/api/chatbot/sample-surveys')
      .then(r => r.json())
      .then((data: SampleSurvey[]) => setSamples(data))
      .catch(() => setSamples([]));

    fetch('/api/chatbot/sample-markdown')
      .then(r => r.json())
      .then((data: MarkdownSample[]) => setMdSamples(data))
      .catch(() => setMdSamples([]));
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
      setInputText(text);
      setParseError(null);
      if (file.name.endsWith('.json')) {
        setInputMode('json');
        try {
          JSON.parse(text);
        } catch {
          setParseError('Invalid JSON file');
        }
      } else if (file.name.endsWith('.md')) {
        setInputMode('md');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleMdFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setInputText(text);
      setParseError(null);
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
      setInputText(text);
      setInputMode('json');
      setParseError(null);
    } catch {
      setParseError(`Failed to load sample "${slug}"`);
    }
    setLoadingSample(false);
  };

  const handleLoadMdSample = async (name: string) => {
    setShowMdSampleDropdown(false);
    setLoadingSample(true);
    try {
      const resp = await fetch(`/api/chatbot/sample-markdown/${name}`);
      const data = await resp.json();
      setInputText(data.content);
      setParseError(null);
    } catch {
      setParseError(`Failed to load markdown sample "${name}"`);
    }
    setLoadingSample(false);
  };

  const handleSubmit = () => {
    if (!inputText.trim() || disabled) return;
    setParseError(null);

    if (hasSession) {
      onSubmit({
        mode: 'conversation',
        message: inputText.trim(),
        provider: selectedProvider,
        model: selectedModel,
      });
      setInputText('');
      return;
    }

    if (inputMode === 'json') {
      try {
        const survey = JSON.parse(inputText);
        onSubmit({ mode: 'json', survey, provider: selectedProvider, model: selectedModel });
        setInputText('');
      } catch {
        setParseError('Invalid JSON — please check your input');
      }
    } else {
      // Both 'nl' and 'md' modes go through the NL pipeline
      onSubmit({
        mode: 'nl',
        description: inputText.trim(),
        provider: selectedProvider,
        model: selectedModel,
      });
      setInputText('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const placeholder = hasSession
    ? 'Ask a follow-up question about the analysis...'
    : inputMode === 'json'
      ? 'Paste your survey JSON here, or use the toolbar above to load a sample...'
      : inputMode === 'md'
        ? 'Upload or load a markdown survey file, or paste markdown content here...'
        : 'Describe the building for fire compliance analysis...\n\nExample: "A two-storey detached dwelling with an attached garage. Ground floor has a kitchen, living room, and hallway. First floor has three bedrooms and a bathroom."';

  return (
    <div className="border-t border-slate-200 bg-white">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-neutral-100">
        {/* Mode toggle — hide when in conversation */}
        {!hasSession && (
          <div className="flex items-center bg-neutral-100 rounded-lg p-0.5">
            <button
              onClick={() => setInputMode('json')}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                inputMode === 'json'
                  ? 'bg-white text-neutral-800 shadow-sm'
                  : 'text-neutral-500 hover:text-neutral-700'
              }`}
            >
              <FileJson2 className="w-3.5 h-3.5" />
              JSON
            </button>
            <button
              onClick={() => setInputMode('nl')}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                inputMode === 'nl'
                  ? 'bg-white text-neutral-800 shadow-sm'
                  : 'text-neutral-500 hover:text-neutral-700'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Describe
            </button>
            <button
              onClick={() => setInputMode('md')}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                inputMode === 'md'
                  ? 'bg-white text-neutral-800 shadow-sm'
                  : 'text-neutral-500 hover:text-neutral-700'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              Markdown
            </button>
          </div>
        )}

        {/* Sample loader — JSON mode only, not in conversation */}
        {!hasSession && inputMode === 'json' && (
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
        )}

        {/* File upload — JSON mode only, not in conversation */}
        {!hasSession && inputMode === 'json' && (
          <>
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
          </>
        )}

        {/* Markdown sample loader — MD mode only, not in conversation */}
        {!hasSession && inputMode === 'md' && (
          <div className="relative">
            <button
              onClick={() => setShowMdSampleDropdown(!showMdSampleDropdown)}
              disabled={disabled || loadingSample}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-600 bg-neutral-50 border border-neutral-200 rounded-lg hover:bg-neutral-100 hover:border-neutral-300 transition-all disabled:opacity-50"
            >
              {loadingSample ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <FileText className="w-3.5 h-3.5" />
              )}
              Samples
              <ChevronDown className="w-3 h-3" />
            </button>
            {showMdSampleDropdown && mdSamples.length > 0 && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMdSampleDropdown(false)} />
                <div className="absolute bottom-full mb-1 left-0 w-72 bg-white border border-neutral-200 rounded-xl shadow-xl z-50 overflow-hidden">
                  <div className="px-3 py-2 text-xs font-semibold text-neutral-400 uppercase tracking-wider bg-neutral-50 border-b border-neutral-100">
                    Load Markdown Survey
                  </div>
                  {mdSamples.map(s => (
                    <button
                      key={s.name}
                      onClick={() => handleLoadMdSample(s.name)}
                      className="w-full text-left px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors border-b border-neutral-50 last:border-0"
                    >
                      <div className="font-medium flex items-center gap-2">
                        {s.filename}
                        {s.tag && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                            s.tag === 'Complete' ? 'bg-emerald-100 text-emerald-700' :
                            s.tag === 'Incomplete' ? 'bg-amber-100 text-amber-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {s.tag}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* File upload — MD mode only, not in conversation */}
        {!hasSession && inputMode === 'md' && (
          <>
            <button
              onClick={() => mdFileInputRef.current?.click()}
              disabled={disabled}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-600 bg-neutral-50 border border-neutral-200 rounded-lg hover:bg-neutral-100 hover:border-neutral-300 transition-all disabled:opacity-50"
            >
              <Upload className="w-3.5 h-3.5" />
              Upload MD
            </button>
            <input
              ref={mdFileInputRef}
              type="file"
              accept=".md,.markdown,.txt"
              onChange={handleMdFileUpload}
              className="hidden"
            />
          </>
        )}

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
            value={inputText}
            onChange={e => { setInputText(e.target.value); setParseError(null); }}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            placeholder={placeholder}
            className={`flex-1 min-h-[60px] max-h-[200px] p-3 text-sm bg-neutral-50 border border-neutral-200 rounded-xl resize-y focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-300 transition-all disabled:opacity-50 placeholder:text-neutral-400 ${
              !hasSession && inputMode === 'json' ? 'font-mono' : 'font-sans'
            }`}
            rows={hasSession ? 2 : 3}
          />
          <button
            onClick={handleSubmit}
            disabled={disabled || !inputText.trim()}
            className="flex items-center gap-2 px-5 py-3 bg-primary-600 text-white text-sm font-medium rounded-md hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed transition-smooth active:scale-95 shrink-0 shadow-sm"
          >
            {disabled ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            {disabled ? 'Processing...' : hasSession ? 'Send' : 'Analyze'}
          </button>
        </div>
        <div className="mt-1.5 text-xs text-neutral-400 text-right">
          Ctrl + Enter to send
        </div>
      </div>
    </div>
  );
};
