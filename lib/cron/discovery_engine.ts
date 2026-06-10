// lib/cron/discovery_engine.ts
//
// Helpers for Vertex AI Search (Discovery Engine).
//
// Two main operations:
//
// 1) importDocumentsFromGcs(): tell Discovery Engine to scan a Cloud Storage
//    prefix and ingest any new or changed unstructured documents found there.
//    This is the sync mechanism for the knowledge base.
//
// 2) searchKb(query): run a search query against the engine. Returns ranked
//    snippets plus an optional Gemini-generated summary if extractiveSegments
//    is enabled. Used by the CRM search UI and by future agentic flows.

import { getGcpAccessToken } from './gcp_auth';

const PROJECT_NUMBER = process.env.GCP_PROJECT_NUMBER || '874303965930';
const DATA_STORE_ID = 'numat-kb';
const ENGINE_ID = 'numat-search';
const LOCATION = 'global';
const COLLECTION = 'default_collection';

const DE_BASE = `https://discoveryengine.googleapis.com/v1`;

function dataStorePath(): string {
  return `${DE_BASE}/projects/${PROJECT_NUMBER}/locations/${LOCATION}/collections/${COLLECTION}/dataStores/${DATA_STORE_ID}`;
}

function enginePath(): string {
  return `${DE_BASE}/projects/${PROJECT_NUMBER}/locations/${LOCATION}/collections/${COLLECTION}/engines/${ENGINE_ID}`;
}

/**
 * Trigger a document import from Cloud Storage. Async; returns the operation
 * name. Discovery Engine will scan the GCS URIs (glob patterns ok) and ingest
 * any new or changed documents. INCREMENTAL mode means existing documents not
 * present in this import are kept.
 */
export async function importDocumentsFromGcs(
  gcsUris: string[]
): Promise<{ operation: string }> {
  const token = await getGcpAccessToken();
  const url = `${dataStorePath()}/branches/default_branch/documents:import`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      gcsSource: { inputUris: gcsUris, dataSchema: 'content' },
      reconciliationMode: 'INCREMENTAL',
    }),
  });
  if (!res.ok) {
    throw new Error(`Document import failed: ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as { name: string };
  return { operation: data.name };
}

export type SearchResult = {
  id: string;
  title?: string;
  snippet?: string;
  link?: string;
  uri?: string;
  derivedStructData?: Record<string, unknown>;
};

export type SearchResponse = {
  results: SearchResult[];
  summary?: string;
  totalSize?: number;
  nextPageToken?: string;
};

/**
 * Run a search query against the NUMAT knowledge base.
 *
 * @param query natural language query
 * @param opts.pageSize how many results to return (default 10, max 100)
 * @param opts.generateSummary whether to ask for a Gemini-generated summary
 */
export async function searchKb(
  query: string,
  opts: { pageSize?: number; offset?: number; generateSummary?: boolean } = {}
): Promise<SearchResponse> {
  const token = await getGcpAccessToken();
  // Engine-level serving config for SEARCH solution type is named `default_search`.
  // Data-store-level uses `default_config`. We're querying the engine.
  const url = `${enginePath()}/servingConfigs/default_search:search`;
  const body: Record<string, unknown> = {
    query,
    pageSize: opts.pageSize ?? 10,
    queryExpansionSpec: { condition: 'AUTO' },
    spellCorrectionSpec: { mode: 'AUTO' },
    contentSearchSpec: {
      snippetSpec: { returnSnippet: true },
    },
  };
  // Offset lets the caller page through results. Page 2 at pageSize 20 sends
  // offset 20, and so on. Vertex returns the slice starting at that offset.
  if (typeof opts.offset === 'number' && opts.offset > 0) {
    body.offset = opts.offset;
  }
  // Note: extractiveContentSpec and summarySpec require Enterprise edition to
  // be enabled on the data store (not just the engine tier). We use plain
  // snippet search for now; turn on enterprise edition in the data store
  // settings via the Discovery Engine console to unlock those features.
  if (opts.generateSummary) {
    // Leave as no-op for now; caller can opt in later when Enterprise on the
    // data store is enabled. We don't return a summary in plain mode.
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`Search failed: ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as any;

  const results: SearchResult[] = (data.results || []).map((r: any) => {
    const doc = r.document || {};
    const dsd = doc.derivedStructData || {};
    return {
      id: doc.id || r.id,
      title: dsd.title,
      snippet: dsd.snippets?.[0]?.snippet,
      link: dsd.link,
      uri: doc.content?.uri,
      derivedStructData: dsd,
    };
  });

  return {
    results,
    summary: data.summary?.summaryText,
    totalSize: data.totalSize,
    nextPageToken: data.nextPageToken,
  };
}
