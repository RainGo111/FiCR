export interface QueryResult {
  title: string;
  columns: string[];
  rows: Record<string, string>[];
  row_count: number;
}

export type SparqlResults = Record<string, QueryResult>;

/** Safely get rows from a query result */
export function getRows(results: SparqlResults, queryId: string): Record<string, string>[] {
  return results[queryId]?.rows ?? [];
}

/** Get row count */
export function getRowCount(results: SparqlResults, queryId: string): number {
  return results[queryId]?.row_count ?? 0;
}

/** Strip URI prefix, return local name after # or / */
export function shortUri(uri: string): string {
  if (!uri) return '';
  const hashIdx = uri.lastIndexOf('#');
  if (hashIdx >= 0) return uri.slice(hashIdx + 1);
  const slashIdx = uri.lastIndexOf('/');
  if (slashIdx >= 0) return uri.slice(slashIdx + 1);
  return uri;
}

/** Parse string to number, return 0 on failure */
export function num(val: string | undefined): number {
  if (!val) return 0;
  const n = parseFloat(val);
  return isNaN(n) ? 0 : n;
}
