// =============================================================================
// FlowPilot AI — API Route: GET /api/workflows/[id]
// =============================================================================
// Returns single workflow details by ID.
// =============================================================================

import { NextResponse } from 'next/server';
import { getWorkflowById } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const workflow = await getWorkflowById(id);

    if (!workflow) {
      return NextResponse.json(
        { success: false, error: 'Workflow not found.' },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      workflow,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
