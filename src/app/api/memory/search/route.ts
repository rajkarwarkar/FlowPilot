// =============================================================================
// FlowPilot AI — API Route: GET /api/memory/search
// =============================================================================
// Calls the server-side Breeth memory search service securely.
// Secrets remain strictly on the server.
// =============================================================================

import { NextResponse } from 'next/server';
import { searchMemory } from '@/lib/memory/breeth';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || searchParams.get('query') || 'customer preference quotation PDF';

    const result = await searchMemory(query.trim());

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Breeth memory search failed';

    // Return clean fallback response if Breeth API returns 0 results or errors
    return NextResponse.json({
      success: true,
      result: {
        query: 'customer preference quotation PDF',
        memories: [],
        totalResults: 0,
        error: message,
      },
    });
  }
}
