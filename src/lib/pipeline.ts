// =============================================================================
// FlowPilot AI — Pipeline Orchestrator (server-side only)
// =============================================================================
// Coordinates the full AI pipeline:
//   1. Gemini structured extraction
//   2. Breeth memory search
//   3. Gemini reasoning + workflow generation
//   4. Supabase persistence (inbox_items, workflows, workflow_steps, activity_logs, ai_runs, approvals)
//   5. Activity logging & latency tracking
// =============================================================================

import { extractIntent, generateWorkflow } from '@/lib/ai/gemini';
import { searchMemory } from '@/lib/memory/breeth';
import {
  saveInboxItem,
  saveWorkflow,
  saveActivityLogs,
  saveAIRun,
  saveApproval,
} from '@/lib/db';
import type {
  PipelineResponse,
  ActivityEvent,
  ExtractedIntent,
  BreethSearchResult,
  WorkflowProposal,
} from '@/lib/types';

function logEvent(
  log: ActivityEvent[],
  type: ActivityEvent['type'],
  detail: string,
): void {
  log.push({
    type,
    timestamp: new Date().toISOString(),
    detail,
  });
}

export async function runPipeline(userMessage: string): Promise<PipelineResponse> {
  const activityLog: ActivityEvent[] = [];

  let extraction: ExtractedIntent | null = null;
  let memoryResult: BreethSearchResult | null = null;
  let workflow: WorkflowProposal | null = null;
  let inboxItemId: string | undefined;
  let workflowId: string | undefined;
  /** Maps stepNumber → real approval record ID in DB */
  const approvalIdMap: Record<number, string> = {};

  // ── Step 0: Receive message ───────────────────────────────────────────
  logEvent(activityLog, 'message_received', `Unstructured work message received (${userMessage.length} characters).`);

  try {
    // ── Step 1: Gemini structured extraction ──────────────────────────────
    const extStart = Date.now();
    extraction = await extractIntent(userMessage);
    const extLatency = Date.now() - extStart;

    await saveAIRun({
      operation: 'intent_extraction',
      model: 'gemini-3.5-flash-lite',
      status: 'success',
      latencyMs: extLatency,
    });

    logEvent(
      activityLog,
      'intent_identified',
      `Intent: "${extraction.intent}" | Contact: "${extraction.contact}" | Priority: ${extraction.priority.toUpperCase()}`,
    );

    // Save inbox item to DB
    inboxItemId = await saveInboxItem({
      originalMessage: userMessage,
      extraction,
    });

    // ── Step 2: Breeth memory search ──────────────────────────────────────
    const searchQuery = `${extraction.company} ${extraction.entities.join(' ')} ${extraction.intent}`;
    logEvent(activityLog, 'memory_searched', `Searching Breeth Memory for: "${searchQuery}"`);

    const memStart = Date.now();
    try {
      memoryResult = await searchMemory(searchQuery);
      const memLatency = Date.now() - memStart;

      await saveAIRun({
        operation: 'memory_search',
        model: 'breeth-v1-search',
        status: 'success',
        latencyMs: memLatency,
      });

      logEvent(
        activityLog,
        'memory_retrieved',
        `Retrieved ${memoryResult.totalResults} relevant memories from Breeth.`,
      );
    } catch (breethError) {
      const memLatency = Date.now() - memStart;
      const msg = breethError instanceof Error ? breethError.message : String(breethError);

      await saveAIRun({
        operation: 'memory_search',
        model: 'breeth-v1-search',
        status: 'error',
        latencyMs: memLatency,
        error: msg,
      });

      logEvent(activityLog, 'error', `Breeth search note (non-fatal): ${msg}`);
      memoryResult = { query: searchQuery, memories: [], totalResults: 0 };
    }

    // ── Step 3: Gemini reasoning + workflow generation ────────────────────
    const wfStart = Date.now();
    workflow = await generateWorkflow(
      extraction,
      memoryResult.memories,
      userMessage,
    );
    const wfLatency = Date.now() - wfStart;

    await saveAIRun({
      operation: 'workflow_generation',
      model: 'gemini-3.5-flash-lite',
      status: 'success',
      latencyMs: wfLatency,
    });

    logEvent(
      activityLog,
      'workflow_generated',
      `Workflow "${workflow.workflowTitle}" generated with ${workflow.steps.length} execution steps.`,
    );

    // ── Step 4: Save Workflow & Steps to DB ──────────────────────────────
    const saveWfRes = await saveWorkflow(inboxItemId, workflow);
    workflowId = saveWfRes.workflowId;
    workflow.id = workflowId;

    // Attach step IDs to steps
    workflow.steps = workflow.steps.map((s) => ({
      ...s,
      id: saveWfRes.stepIds[s.stepNumber] || `step-${s.stepNumber}`,
    }));

    // ── Step 5: Save Approvals for Consequential Actions ────────────────
    const approvalSteps = workflow.steps.filter((s) => s.requiresApproval);
    for (const step of approvalSteps) {
      const appKey = await saveApproval({
        workflowId,
        workflowTitle: workflow.workflowTitle,
        stepId: step.id,
        stepNumber: step.stepNumber,
        proposedAction: step.action,
        description: step.description,
      });
      // Store the real approval DB ID keyed by step number
      approvalIdMap[step.stepNumber] = appKey;
      logEvent(
        activityLog,
        'approval_requested',
        `Human approval requested for Step ${step.stepNumber}: "${step.action}" [Ref: ${appKey.slice(0, 8)}]`,
      );
    }

    // Save all activity logs to DB
    await saveActivityLogs(activityLog, workflowId);

    return {
      success: true,
      inboxItemId,
      workflowId,
      extraction,
      memorySearch: memoryResult,
      workflow,
      activityLog,
      approvalIdMap,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'An unknown error occurred.';

    const safeMessage = message
      .replace(/Bearer\s+\S+/gi, 'Bearer [REDACTED]')
      .replace(/key[=:]\s*\S+/gi, 'key=[REDACTED]');

    logEvent(activityLog, 'error', safeMessage);

    // Save activity logs even on error
    await saveActivityLogs(activityLog, workflowId);

    return {
      success: false,
      inboxItemId,
      workflowId,
      extraction,
      memorySearch: memoryResult,
      workflow,
      activityLog,
      error: safeMessage,
    };
  }
}
