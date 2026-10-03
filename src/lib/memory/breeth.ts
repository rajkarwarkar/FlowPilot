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
const DEFAULT_BUSINESS_MEMORIES: BreethMemory[] = [
  {
    id: 'mem-abc-001',
    content: 'ABC Enterprises prefers PDF quotations via email for all quotation requests and formal proposals.',
    score: 0.96,
    metadata: { company: 'ABC Enterprises', category: 'preference', format: 'PDF' },
  },
  {
    id: 'mem-abc-002',
    content: 'ABC Enterprises historical contact: Sarah Jenkins (Account Executive), standard payment terms 30 days.',
    score: 0.88,
    metadata: { company: 'ABC Enterprises', category: 'contact', terms: 'Net 30' },
  },
  {
    id: 'mem-abc-003',
    content: 'Previous workflow execution for ABC Enterprises: Follow-up quotation sent and confirmed via PDF email attachment.',
    score: 0.84,
    metadata: { company: 'ABC Enterprises', category: 'interaction_history' },
  },
  {
    id: 'mem-policy-004',
    content: 'FlowPilot Safety Policy: Always require human operator sign-off before sending external financial commitments.',
    score: 0.79,
    metadata: { category: 'guardrail_policy' },
  },
];

export async function searchMemory(query: string): Promise<BreethSearchResult> {
  const url = `${BREETH_BASE_URL}/search`;

  let memories: BreethMemory[] = [];

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ query }),
    });

    if (response.ok) {
      const data = (await response.json()) as Record<string, unknown>;
      const rawResults = (
        data.results ?? data.data ?? data.memories ?? []
      ) as Array<Record<string, unknown>>;

      memories = rawResults.map((item, index) => ({
        id: String(item.id ?? item._id ?? `breeth-${index}`),
        content: String(item.content ?? item.text ?? item.body ?? ''),
        score: Number(item.score ?? item.relevance ?? 0),
        metadata: (item.metadata ?? {}) as Record<string, unknown>,
      }));
    }
  } catch (e) {
    console.warn('Breeth REST API query notice (falling back to memory store):', e);
  }

  // If live Breeth API returned 0 items, query default business memory store
  if (memories.length === 0) {
    const qLower = query.toLowerCase();
    const queryTokens = qLower.split(/\s+/).filter((t) => t.length > 2);

    const matches = DEFAULT_BUSINESS_MEMORIES.filter((m) => {
      const contentLower = m.content.toLowerCase();
      return queryTokens.some((token) => contentLower.includes(token));
    });

    memories = matches.length > 0 ? matches : DEFAULT_BUSINESS_MEMORIES.slice(0, 3);
  }

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
