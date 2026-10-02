// =============================================================================
// FlowPilot AI — API Route: GET /api/dashboard
// =============================================================================
// Returns real Supabase/DB summary metrics, recent activity timeline, and pending approvals.
// =============================================================================

import { NextResponse } from 'next/server';
import { getDashboardMetrics, getPendingApprovals, getRecentActivity } from '@/lib/db';

export async function GET() {
  try {
    const [metrics, pendingApprovals, recentActivity] = await Promise.all([
      getDashboardMetrics(),
      getPendingApprovals(),
      getRecentActivity(25),
    ]);

    return NextResponse.json({
      success: true,
      metrics,
      pendingApprovals,
      recentActivity,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
