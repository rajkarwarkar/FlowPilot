// =============================================================================
// FlowPilot AI — API Route: POST /api/pipeline
// =============================================================================
// Server-side only. Receives user input, runs the full AI pipeline, and returns
// the structured workflow proposal. All API keys stay on the server.
// =============================================================================

import { NextResponse } from 'next/server';
import { runPipeline } from '@/lib/pipeline';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { message?: string };

    if (!body.message || typeof body.message !== 'string' || body.message.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'A non-empty "message" field is required.' },
        { status: 400 },
      );
    }

    const result = await runPipeline(body.message.trim());
    return NextResponse.json(result, { status: result.success ? 200 : 500 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
