// =============================================================================
// FlowPilot AI — API Route: GET /api/analytics
// =============================================================================
// Returns real calculated productivity/automation metrics.
// =============================================================================

import { NextResponse } from 'next/server';
import { getAnalyticsMetrics } from '@/lib/db';

export async function GET() {
  try {
    const analytics = await getAnalyticsMetrics();
    return NextResponse.json({
      success: true,
      analytics,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
