// =============================================================================
// FlowPilot AI — Breeth Memory Service (server-side only)
// =============================================================================
// Communicates with the Breeth REST API (https://api.thebreeth.com/v1).
// API key is read from process.env.BREETH_API_KEY — never exposed to the browser.
// =============================================================================

import type { BreethMemory, BreethSearchResult } from '@/lib/types';

const BREETH_BASE_URL = 'https://api.thebreeth.com/v1';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getApiKey(): string {
  const apiKey = process.env.BREETH_API_KEY;
  if (!apiKey) {
    throw new Error(
      'BREETH_API_KEY is not set. Add it to .env.local and restart the server.'
    );
  }
  return apiKey;
}

function headers(): HeadersInit {
  return {
    Authorization: `Bearer ${getApiKey()}`,
    'Content-Type': 'application/json',
  };
}

// ---------------------------------------------------------------------------
// Memory Search — POST /v1/search
// ---------------------------------------------------------------------------

export async function searchMemory(query: string): Promise<BreethSearchResult> {
  const url = `${BREETH_BASE_URL}/search`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ query }),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Breeth search network error: ${message}`);
  }

  if (!response.ok) {
    const body = await response.text().catch(() => '(no body)');
    throw new Error(
      `Breeth search failed (${response.status}): ${body.slice(0, 300)}`
    );
  }

  let data: Record<string, unknown>;
  try {
    data = (await response.json()) as Record<string, unknown>;
  } catch {
    throw new Error('Breeth search returned invalid JSON.');
  }

  // Normalize the response into our BreethSearchResult shape.
  // The Breeth API may return results under "results", "data", or "memories".
  const rawResults = (
    data.results ?? data.data ?? data.memories ?? []
  ) as Array<Record<string, unknown>>;

  const memories: BreethMemory[] = rawResults.map((item, index) => ({
    id: String(item.id ?? item._id ?? `breeth-${index}`),
    content: String(item.content ?? item.text ?? item.body ?? ''),
    score: Number(item.score ?? item.relevance ?? 0),
    metadata: (item.metadata ?? {}) as Record<string, unknown>,
  }));

  return {
    query,
    memories,
    totalResults: memories.length,
  };
}

// ---------------------------------------------------------------------------
// Memory Write — POST /v1/episodes
// ---------------------------------------------------------------------------

export interface EpisodePayload {
  content: string;
  metadata?: Record<string, unknown>;
  extractIntent?: boolean;
}

export async function writeEpisode(payload: EpisodePayload): Promise<Record<string, unknown>> {
  const url = `${BREETH_BASE_URL}/episodes`;

  const body: Record<string, unknown> = {
    content: payload.content,
    extract_intent: payload.extractIntent ?? true,
  };
  if (payload.metadata) {
    body.metadata = payload.metadata;
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(body),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Breeth episode write network error: ${message}`);
  }

  if (!response.ok) {
    const responseBody = await response.text().catch(() => '(no body)');
    throw new Error(
      `Breeth episode write failed (${response.status}): ${responseBody.slice(0, 300)}`
    );
  }

  try {
    return (await response.json()) as Record<string, unknown>;
  } catch {
    // Some endpoints return 201 with no body
    return { success: true };
  }
}
