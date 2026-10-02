// =============================================================================
// FlowPilot AI — API Route: GET /api/activity
// =============================================================================
// Returns chronological global activity logs from Supabase database.
// =============================================================================

import { NextResponse } from 'next/server';
import { getRecentActivity } from '@/lib/db';

export async function GET() {
  try {
    const activity = await getRecentActivity(100);
    return NextResponse.json({
      success: true,
      activity,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
