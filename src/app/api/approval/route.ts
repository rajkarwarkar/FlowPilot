// =============================================================================
// FlowPilot AI — API Route: POST /api/approval
// =============================================================================
// Handles human approval decisions: Approve or Reject proposed consequential actions.
// Updates DB records, workflow step status, and generates activity logs.
// =============================================================================

import { NextResponse } from 'next/server';
import { updateApprovalStatus } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      approvalId?: string;
      action?: 'approved' | 'rejected';
    };

    if (!body.approvalId || !body.action || !['approved', 'rejected'].includes(body.action)) {
      return NextResponse.json(
        { success: false, error: 'Valid "approvalId" and action ("approved" | "rejected") are required.' },
        { status: 400 },
      );
    }

    const result = await updateApprovalStatus(body.approvalId, body.action);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: 'Approval record not found or could not be updated.' },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      message: `Action ${body.action}`,
      workflowId: result.workflowId,
      stepNumber: result.stepNumber,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}
