import React, { useState } from 'react';
import { Card } from '../components/shared';
<<<<<<< HEAD
import {
  Play,
  Loader2,
  AlertCircle,
  Terminal,
  ChevronDown,
  Table2,
  Info,
  BookOpen
} from 'lucide-react';
import { PRESET_GROUPS } from '../content/queries';
=======
import { Play, Loader2, AlertCircle, Terminal, ChevronDown, Table2, Info } from 'lucide-react';
>>>>>>> 47723d3e83f6e465d6434cb301919fe7437ba3c5

interface SparqlBinding {
  [variable: string]: {
    type: string;
    value: string;
    datatype?: string;
<<<<<<< HEAD
    "xml:lang"?: string;
=======
>>>>>>> 47723d3e83f6e465d6434cb301919fe7437ba3c5
  };
}

interface SparqlResults {
  head: { vars: string[] };
  results: { bindings: SparqlBinding[] };
}

<<<<<<< HEAD
=======
const PRESET_QUERIES = [
  {
    label: 'List all classes',
    query: `PREFIX owl: <http://www.w3.org/2002/07/owl#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

SELECT ?class ?label
WHERE {
  ?class a owl:Class .
  OPTIONAL { ?class rdfs:label ?label . }
}
ORDER BY ?class`,
  },
  {
    label: 'List all object properties',
    query: `PREFIX owl: <http://www.w3.org/2002/07/owl#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

SELECT ?property ?domain ?range
WHERE {
  ?property a owl:ObjectProperty .
  OPTIONAL { ?property rdfs:domain ?domain . }
  OPTIONAL { ?property rdfs:range ?range . }
}
ORDER BY ?property`,
  },
  {
    label: 'List all datatype properties',
    query: `PREFIX owl: <http://www.w3.org/2002/07/owl#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

SELECT ?property ?domain ?range
WHERE {
  ?property a owl:DatatypeProperty .
  OPTIONAL { ?property rdfs:domain ?domain . }
  OPTIONAL { ?property rdfs:range ?range . }
}
ORDER BY ?property`,
  },
  {
    label: 'Query buildings',
    query: `PREFIX ficr: <http://example.org/ficr#>
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>

SELECT ?building ?purposeGroup ?sprinklerStatus ?height ?hazardClass
WHERE {
  ?building rdf:type ficr:Building ;
            ficr:purposeGroup ?purposeGroup ;
            ficr:sprinklerStatus ?sprinklerStatus ;
            ficr:overallHeight_m ?height ;
            ficr:hazardClass ?hazardClass .
}`,
  },
];

>>>>>>> 47723d3e83f6e465d6434cb301919fe7437ba3c5
function shortenUri(uri: string): string {
  const hashIdx = uri.lastIndexOf('#');
  if (hashIdx !== -1) return uri.substring(hashIdx + 1);
  const slashIdx = uri.lastIndexOf('/');
  if (slashIdx !== -1) return uri.substring(slashIdx + 1);
  return uri;
}

export const QueryLab: React.FC = () => {
<<<<<<< HEAD
  const [query, setQuery] = useState(PRESET_GROUPS[0].queries[0].query);
  const [results, setResults] = useState<SparqlResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // State for the styled select dropdown
  const [isOpen, setIsOpen] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState(PRESET_GROUPS[0].queries[0].label);

  const runQuery = async () => {
=======
  const [query, setQuery] = useState(PRESET_QUERIES[0].query);
  const [results, setResults] = useState<SparqlResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [presetsOpen, setPresetsOpen] = useState(false);

  const runQuery = async () => {
    if (!query.trim()) return;

>>>>>>> 47723d3e83f6e465d6434cb301919fe7437ba3c5
    setLoading(true);
    setError(null);
    setResults(null);

    try {
<<<<<<< HEAD
      const params = new URLSearchParams();
      params.append('query', query);

      const response = await fetch('/api/graphdb', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
        },
        body: params.toString(),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Query failed: ${response.status} ${response.statusText}\n${text}`);
      }

      const data = await response.json();
      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while executing the query');
=======
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sparql-query`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: query.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Request failed with status ${response.status}`);
      }

      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
>>>>>>> 47723d3e83f6e465d6434cb301919fe7437ba3c5
    } finally {
      setLoading(false);
    }
  };

<<<<<<< HEAD
  const selectPreset = (newQuery: string, label: string) => {
    setQuery(newQuery);
    setSelectedLabel(label);
    setIsOpen(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 animate-in fade-in duration-500">

      {/* Header Section */}
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-display font-bold text-neutral-900 mb-4 tracking-tight">
          Query Lab
        </h1>
        <p className="text-lg text-neutral-600 max-w-3xl mx-auto leading-relaxed">
          The engine room of FiCR intelligence. Interact directly with the building’s <span className="font-semibold text-primary-700">Semantic Digital Twin</span> using <span className="font-semibold text-primary-700">SPARQL</span> to quantify fire risks and <span className="font-semibold text-primary-700">EML/PML</span> scenarios.
        </p>
      </div>

      <div className="flex flex-col gap-8">

        {/* Editor Section */}
        <div className="space-y-6">
          <Card className="overflow-hidden border-neutral-200 shadow-xl bg-white flex flex-col">

            {/* Toolbar */}
            <div className="border-b border-neutral-200 bg-neutral-50 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-neutral-600">
                <Terminal className="w-4 h-4" />
                <span className="font-medium text-sm">SPARQL Editor</span>
              </div>

              <div className="flex items-center gap-3">
                {/* Preset Queries Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-neutral-700 bg-white border border-neutral-300 rounded-lg hover:bg-neutral-50 hover:border-primary-300 focus:ring-2 focus:ring-primary-500/20 transition-all shadow-sm w-64 justify-between"
                  >
                    <span className="truncate">{selectedLabel}</span>
                    <ChevronDown className={`w-4 h-4 text-neutral-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
                      <div className="absolute right-0 mt-2 w-96 bg-white border border-neutral-200 rounded-xl shadow-2xl z-50 max-h-[50vh] overflow-y-auto ring-1 ring-black/5 origin-top-right transform transition-all">
                        {PRESET_GROUPS.map((group, groupIdx) => {
                          // Module specific colors/styles
                          let headerBg = "bg-neutral-50";
                          let headerText = "text-neutral-500";
                          let borderAccent = "border-neutral-200";

                          if (group.category.includes("Module 1")) {
                            headerBg = "bg-blue-50"; headerText = "text-blue-700"; borderAccent = "border-blue-100";
                          } else if (group.category.includes("Module 2")) {
                            headerBg = "bg-amber-50"; headerText = "text-amber-700"; borderAccent = "border-amber-100";
                          } else if (group.category.includes("Module 3")) {
                            headerBg = "bg-purple-50"; headerText = "text-purple-700"; borderAccent = "border-purple-100";
                          } else if (group.category.includes("Module 4")) {
                            headerBg = "bg-emerald-50"; headerText = "text-emerald-700"; borderAccent = "border-emerald-100";
                          }

                          return (
                            <div key={groupIdx} className={`mb-0 border-b ${borderAccent} last:border-0`}>
                              <div className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider sticky top-0 backdrop-blur-md z-10 flex items-center gap-2 ${headerBg} ${headerText} shadow-sm`}>
                                <span className="opacity-75">#{groupIdx + 1}</span>
                                {group.category}
                              </div>
                              <div className="py-1">
                                {group.queries.map((preset, idx) => (
                                  <button
                                    key={idx}
                                    onClick={() => selectPreset(preset.query, preset.label)}
                                    className={`w-full text-left px-5 py-3 text-sm transition-all border-l-4 group relative
                                      ${selectedLabel === preset.label
                                        ? 'bg-primary-50 text-primary-900 border-primary-500 font-medium'
                                        : 'text-neutral-600 border-transparent hover:bg-neutral-50 hover:border-neutral-200 hover:text-neutral-900'
                                      }
                                    `}
                                  >
                                    <div className="flex items-start justify-between gap-2">
                                      <span className="truncate flex-1 font-medium">{preset.label}</span>
                                      {selectedLabel === preset.label && <div className="w-1.5 h-1.5 rounded-full bg-primary-500 mt-1.5 shrink-0" />}
                                    </div>
                                    {preset.description && (
                                      <div className={`text-xs mt-1 truncate transition-opacity ${selectedLabel === preset.label ? 'text-primary-600/80' : 'text-neutral-400 group-hover:text-neutral-500'}`}>
                                        {preset.description.split('/')[0]}
                                      </div>
                                    )}
                                  </button>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                        {/* Spacer to ensure last item is fully visible when scrolling */}
                        <div className="h-12 w-full bg-transparent flex-shrink-0" />
                      </div>
                    </>
                  )}
                </div>

                <button
                  onClick={runQuery}
                  disabled={loading}
                  className="flex items-center gap-2 px-5 py-1.5 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 focus:ring-4 focus:ring-primary-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md active:scale-95"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
                  Run
                </button>
              </div>
            </div>

            {/* Editor Area */}
            <div className="relative">
              <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full h-[400px] p-5 font-mono text-sm bg-[#1e1e1e] text-[#d4d4d4] resize-none focus:outline-none leading-relaxed"
                spellCheck="false"
              />
              <div className="absolute bottom-3 right-4 text-xs text-neutral-500 pointer-events-none select-none bg-[#1e1e1e]/80 px-2 py-1 rounded">
                Ctrl + Enter to execute
              </div>
            </div>
          </Card>

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2 shadow-sm">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-red-900">Query Execution Failed</h3>
                <pre className="text-xs text-red-700 overflow-x-auto whitespace-pre-wrap font-mono mt-1">
                  {error}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Results Section */}
        <div className="space-y-6">
          {results ? (
            <Card className="animate-in fade-in slide-in-from-bottom-4 border-neutral-200 shadow-lg flex flex-col">
              <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between bg-white rounded-t-xl shrink-0">
                <div className="flex items-center gap-2">
                  <Table2 className="w-4 h-4 text-primary-600" />
                  <h2 className="font-semibold text-neutral-900">Results</h2>
                </div>
                <span className="px-2.5 py-1 bg-primary-50 text-primary-700 text-xs font-bold rounded-full">
                  {results.results.bindings.length} Records
                </span>
              </div>
              <div className="overflow-auto max-h-[800px]">
                <table className="w-full text-left text-sm">
                  <thead className="bg-neutral-50 text-neutral-500 font-medium border-b border-neutral-200 sticky top-0 z-10">
                    <tr>
                      {results.head.vars.map((v) => (
                        <th key={v} className="px-4 py-3 whitespace-nowrap bg-neutral-50">
                          ?{v}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 bg-white">
                    {results.results.bindings.length > 0 ? (
                      results.results.bindings.map((binding, i) => (
                        <tr key={i} className="hover:bg-neutral-50/80 transition-colors">
                          {results.head.vars.map((v) => (
                            <td key={v} className="px-4 py-3 text-neutral-700 max-w-[300px] truncate" title={binding[v]?.value}>
                              {binding[v] ? (
                                binding[v].type === 'uri' ? (
                                  <span className="text-primary-600 hover:underline cursor-pointer" title={binding[v].value}>
                                    {shortenUri(binding[v].value)}
                                  </span>
                                ) : (
                                  binding[v].value
                                )
                              ) : (
                                <span className="text-neutral-300">-</span>
                              )}
                            </td>
                          ))}
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={results.head.vars.length} className="px-4 py-12 text-center text-neutral-500">
                          <div className="flex flex-col items-center gap-3">
                            <Info className="w-8 h-8 text-neutral-300" />
                            <p>No results found.</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          ) : (
            <Card className="min-h-[300px] border-dashed border-2 border-neutral-200 bg-neutral-50/50 flex flex-col items-center justify-center text-center p-8 animate-in fade-in">
              <div className="bg-white p-4 rounded-full shadow-sm mb-4">
                <Play className="w-6 h-6 text-neutral-400 ml-1" />
              </div>
              <h3 className="text-neutral-900 font-medium mb-1">Ready to Run</h3>
              <p className="text-neutral-500 text-sm">
                Select a preset or execute your custom SPARQL query to see results here.
              </p>
              <div className="mt-6 flex flex-col gap-2 w-full max-w-xs">
                <div className="text-xs font-semibold text-neutral-400 uppercase tracking-widest mb-1">Documentation Helper</div>
                <button className="flex items-center justify-between px-3 py-2 text-xs text-neutral-600 bg-white border border-neutral-200 rounded hover:border-primary-300 hover:text-primary-700 transition-all">
                  <span>Prefixes Guide</span>
                  <BookOpen className="w-3 h-3" />
                </button>
                <button className="flex items-center justify-between px-3 py-2 text-xs text-neutral-600 bg-white border border-neutral-200 rounded hover:border-primary-300 hover:text-primary-700 transition-all">
                  <span>GraphDB Syntax</span>
                  <Info className="w-3 h-3" />
                </button>
              </div>
            </Card>
          )}
        </div>
      </div>
=======
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      runQuery();
    }
  };

  const selectPreset = (presetQuery: string) => {
    setQuery(presetQuery);
    setPresetsOpen(false);
  };

  const bindingCount = results?.results?.bindings?.length ?? 0;
  const variables = results?.head?.vars ?? [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-neutral-900 text-white p-2.5 rounded-xl">
            <Terminal className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-neutral-900">SPARQL Query Lab</h1>
          </div>
        </div>
        <p className="text-lg text-neutral-600">
          Write and execute SPARQL queries against the FiCR knowledge graph
        </p>
      </div>

      <Card className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <label className="text-sm font-medium text-neutral-700">SPARQL Query</label>
          <div className="relative">
            <button
              onClick={() => setPresetsOpen(!presetsOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-neutral-600 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors"
            >
              Preset Queries
              <ChevronDown className={`w-4 h-4 transition-transform ${presetsOpen ? 'rotate-180' : ''}`} />
            </button>
            {presetsOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setPresetsOpen(false)} />
                <div className="absolute right-0 mt-1 w-64 bg-white border border-neutral-200 rounded-xl shadow-large z-20 py-1">
                  {PRESET_QUERIES.map((preset, idx) => (
                    <button
                      key={idx}
                      onClick={() => selectPreset(preset.query)}
                      className="w-full text-left px-4 py-2.5 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={12}
          spellCheck={false}
          className="w-full font-mono text-sm bg-neutral-50 border border-neutral-200 rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-neutral-400 focus:border-transparent resize-y text-neutral-900 placeholder-neutral-400 leading-relaxed"
          placeholder="Enter your SPARQL query here..."
        />

        <div className="flex items-center justify-between mt-4">
          <span className="text-xs text-neutral-500">
            Press Cmd+Enter / Ctrl+Enter to run
          </span>
          <button
            onClick={runQuery}
            disabled={loading || !query.trim()}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-neutral-900 text-white text-sm font-medium rounded-xl hover:bg-neutral-700 disabled:bg-neutral-300 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            {loading ? 'Running...' : 'Run Query'}
          </button>
        </div>
      </Card>

      {error && (
        <Card className="mb-6 border border-red-200 bg-red-50">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-red-800 mb-1">Query Error</p>
              <p className="text-sm text-red-700 font-mono whitespace-pre-wrap break-all">{error}</p>
            </div>
          </div>
        </Card>
      )}

      {results && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Table2 className="w-5 h-5 text-neutral-600" />
              <h2 className="text-lg font-semibold text-neutral-900">Results</h2>
            </div>
            <span className="text-sm text-neutral-500">
              {bindingCount} {bindingCount === 1 ? 'row' : 'rows'} returned
            </span>
          </div>

          {bindingCount === 0 ? (
            <div className="flex items-center gap-3 py-12 justify-center text-neutral-500">
              <Info className="w-5 h-5" />
              <span>Query returned no results</span>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-neutral-200">
              <table className="min-w-full divide-y divide-neutral-200">
                <thead className="bg-neutral-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase w-12">#</th>
                    {variables.map((v) => (
                      <th key={v} className="px-4 py-3 text-left text-xs font-medium text-neutral-700 uppercase tracking-wider">
                        ?{v}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-neutral-100">
                  {results.results.bindings.map((binding, rowIdx) => (
                    <tr key={rowIdx} className="hover:bg-neutral-50 transition-colors">
                      <td className="px-4 py-3 text-xs text-neutral-400 font-mono">{rowIdx + 1}</td>
                      {variables.map((v) => {
                        const cell = binding[v];
                        if (!cell) {
                          return <td key={v} className="px-4 py-3 text-sm text-neutral-300 italic">--</td>;
                        }
                        const isUri = cell.type === 'uri';
                        return (
                          <td key={v} className="px-4 py-3 text-sm text-neutral-900 max-w-xs">
                            {isUri ? (
                              <span className="font-mono text-xs break-all" title={cell.value}>
                                {shortenUri(cell.value)}
                              </span>
                            ) : (
                              <span className="break-words">{cell.value}</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}
>>>>>>> 47723d3e83f6e465d6434cb301919fe7437ba3c5
    </div>
  );
};
