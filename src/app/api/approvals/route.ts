// =============================================================================
// FlowPilot AI — API Route: GET & POST /api/approvals
// =============================================================================
// GET: Returns all approval records from Supabase database.
// POST: Allows editing proposed action before approval.
// =============================================================================

import { NextResponse } from 'next/server';
import { getAllApprovals, updateApprovalAction } from '@/lib/db';

export async function GET() {
  try {
    const approvals = await getAllApprovals();
    return NextResponse.json({
      success: true,
      approvals,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { approvalId?: string; newAction?: string };

    if (!body.approvalId || !body.newAction || !body.newAction.trim()) {
      return NextResponse.json(
        { success: false, error: 'Valid approvalId and non-empty newAction are required.' },
        { status: 400 },
      );
    }

    const res = await updateApprovalAction(body.approvalId, body.newAction.trim());

    if (!res.success) {
      return NextResponse.json(
        { success: false, error: 'Approval record not found.' },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Proposed action updated successfully.',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
