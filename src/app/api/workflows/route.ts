// =============================================================================
// FlowPilot AI — API Route: GET /api/workflows
// =============================================================================
// Returns all workflows from Supabase database.
// =============================================================================

import { NextResponse } from 'next/server';
import { getAllWorkflows } from '@/lib/db';

export async function GET() {
  try {
    const workflows = await getAllWorkflows();
    return NextResponse.json({
      success: true,
      workflows,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
