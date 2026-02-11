import { useState, useCallback } from 'react';

interface SparqlBinding {
    [key: string]: {
        type: string;
        value: string;
        datatype?: string;
    };
}

interface SparqlResponse {
    head: {
        vars: string[];
    };
    results: {
        bindings: SparqlBinding[];
    };
}

interface UseSparqlQueryReturn<T> {
    loading: boolean;
    error: string | null;
    data: T[] | null;
    execute: (query: string) => Promise<T[] | null>;
}

export function useSparqlQuery<T>(): UseSparqlQueryReturn<T> {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<T[] | null>(null);

    const execute = useCallback(async (query: string) => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch('/api/graphdb', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Accept': 'application/sparql-results+json',
                },
                body: new URLSearchParams({ query }),
            });

            if (!response.ok) {
                // Try to read error text if available
                const errorText = await response.text().catch(() => response.statusText);
                console.error(`GraphDB Fetch Error (${response.status}):`, errorText);
                throw new Error(`GraphDB Error (${response.status}): ${errorText}`);
            }

            const result: SparqlResponse = await response.json();

            // Map bindings to a simpler key-value object
            const mappedData: T[] = result.results.bindings.map((binding) => {
                const row: any = {};
                result.head.vars.forEach((v) => {
                    if (binding[v]) {
                        // Attempt to parse numbers if datatype is strictly numeric
                        const val = binding[v];
                        if (val.datatype === 'http://www.w3.org/2001/XMLSchema#decimal' ||
                            val.datatype === 'http://www.w3.org/2001/XMLSchema#integer' ||
                            val.datatype === 'http://www.w3.org/2001/XMLSchema#double' ||
                            val.datatype === 'http://www.w3.org/2001/XMLSchema#float') {
                            row[v] = parseFloat(val.value);
                        } else if (val.datatype === 'http://www.w3.org/2001/XMLSchema#boolean') {
                            row[v] = val.value === 'true';
                        } else {
                            row[v] = val.value;
                        }
                    } else {
                        row[v] = null;
                    }
                });
                return row as T;
            });

            setData(mappedData);
            return mappedData;
        } catch (err: any) {
            const msg = err instanceof Error ? err.message : 'Unknown SPARQL error';
            console.error('SPARQL Query Failed:', msg);
            setError(msg);
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    return { loading, error, data, execute };
}
