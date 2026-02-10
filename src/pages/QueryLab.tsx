import React, { useState } from 'react';
import { Card } from '../components/shared';
import { Play, Loader2, AlertCircle, Terminal, ChevronDown, Table2, Info } from 'lucide-react';

interface SparqlBinding {
  [variable: string]: {
    type: string;
    value: string;
    datatype?: string;
  };
}

interface SparqlResults {
  head: { vars: string[] };
  results: { bindings: SparqlBinding[] };
}

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

function shortenUri(uri: string): string {
  const hashIdx = uri.lastIndexOf('#');
  if (hashIdx !== -1) return uri.substring(hashIdx + 1);
  const slashIdx = uri.lastIndexOf('/');
  if (slashIdx !== -1) return uri.substring(slashIdx + 1);
  return uri;
}

export const QueryLab: React.FC = () => {
  const [query, setQuery] = useState(PRESET_QUERIES[0].query);
  const [results, setResults] = useState<SparqlResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [presetsOpen, setPresetsOpen] = useState(false);

  const runQuery = async () => {
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setResults(null);

    try {
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
    } finally {
      setLoading(false);
    }
  };

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
    </div>
  );
};
