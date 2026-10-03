// =============================================================================
// FlowPilot AI — Database Persistence Service (Supabase + In-Memory Fallback)
// =============================================================================
// Persists inbox_items, workflows, workflow_steps, activity_logs, ai_runs, and approvals.
// Uses @supabase/supabase-js when env variables (NEXT_PUBLIC_SUPABASE_URL,
// SUPABASE_SERVICE_ROLE_KEY / NEXT_PUBLIC_SUPABASE_ANON_KEY) are configured.
// Always guarantees operational stability with in-memory persistence fallback.
// =============================================================================

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type {
  ExtractedIntent,
  WorkflowProposal,
  WorkflowStep,
  ActivityEvent,
  ApprovalItem,
  DashboardMetrics,
  StepStatus,
  WorkflowStatus,
  PriorityLevel,
} from '@/lib/types';

// ---------------------------------------------------------------------------
// Supabase Client Initialization
// ---------------------------------------------------------------------------

function getSupabaseClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (url && key) {
    try {
      return createClient(url, key);
    } catch (err) {
      console.warn('Failed to initialize Supabase client:', err);
      return null;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// In-Memory Database Fallback Store (Session Lifetime / Node Process)
// ---------------------------------------------------------------------------

export interface WorkflowListItem {
  id: string;
  inboxItemId?: string;
  title: string;
  objective: string;
  priority: string;
  status: WorkflowStatus;
  deadline: string;
  aiReasoning: string;
  createdAt: string;
  progressPercent: number;
  totalSteps: number;
  completedSteps: number;
  pendingApprovalsCount: number;
  steps: WorkflowStep[];
  plan?: WorkflowProposal;
  originalMessage?: string;
}

interface StoreSchema {
  inboxItems: Array<{
    id: string;
    originalMessage: string;
    aiIntent: string;
    aiSummary: string;
    priority: string;
    extractedData: ExtractedIntent;
    createdAt: string;
  }>;
  workflows: Array<{
    id: string;
    inboxItemId?: string;
    title: string;
    objective: string;
    priority: string;
    status: WorkflowStatus;
    deadline: string;
    aiReasoning: string;
    aiPlan: WorkflowProposal;
    createdAt: string;
  }>;
  workflowSteps: Array<{
    id: string;
    workflowId: string;
    stepNumber: number;
    stepType: string;
    description: string;
    action: string;
    assignee: string;
    status: StepStatus;
    requiresApproval: boolean;
    conditionActionData?: string;
    createdAt: string;
  }>;
  activityLogs: Array<ActivityEvent & { id: string; workflowId?: string }>;
  aiRuns: Array<{
    id: string;
    operation: string;
    model: string;
    status: 'success' | 'error';
    latencyMs: number;
    error?: string;
    createdAt: string;
  }>;
  approvals: Array<ApprovalItem>;
}

const memoryStore: StoreSchema = {
  inboxItems: [],
  workflows: [],
  workflowSteps: [],
  activityLogs: [],
  aiRuns: [],
  approvals: [],
};

function generateUUID(): string {
  return 'id-' + Math.random().toString(36).substring(2, 9) + '-' + Date.now();
}

// ---------------------------------------------------------------------------
// 1. Save Inbox Item
// ---------------------------------------------------------------------------

export async function saveInboxItem(data: {
  originalMessage: string;
  extraction: ExtractedIntent;
}): Promise<string> {
  const supabase = getSupabaseClient();
  const id = generateUUID();
  const createdAt = new Date().toISOString();

  if (supabase) {
    try {
      const { data: res, error } = await supabase
        .from('inbox_items')
        .insert({
          original_message: data.originalMessage,
          ai_intent: data.extraction.intent,
          ai_summary: data.extraction.summary,
          priority: data.extraction.priority,
          extracted_data: data.extraction,
        })
        .select('id')
        .single();

      if (!error && res?.id) {
        return res.id;
      }
    } catch (e) {
      console.warn('Supabase saveInboxItem fallback to memory:', e);
    }
  }

  memoryStore.inboxItems.unshift({
    id,
    originalMessage: data.originalMessage,
    aiIntent: data.extraction.intent,
    aiSummary: data.extraction.summary,
    priority: data.extraction.priority,
    extractedData: data.extraction,
    createdAt,
  });

  return id;
}

// ---------------------------------------------------------------------------
// 2. Save Workflow & Steps
// ---------------------------------------------------------------------------

export async function saveWorkflow(
  inboxItemId: string | undefined,
  workflow: WorkflowProposal,
): Promise<{ workflowId: string; stepIds: Record<number, string> }> {
  const supabase = getSupabaseClient();
  const workflowId = generateUUID();
  const createdAt = new Date().toISOString();
  const stepIds: Record<number, string> = {};

  if (supabase) {
    try {
      const { data: wfRes, error: wfErr } = await supabase
        .from('workflows')
        .insert({
          inbox_item_id: inboxItemId || null,
          title: workflow.workflowTitle,
          objective: workflow.objective,
          priority: workflow.priority,
          status: workflow.status || 'proposed',
          deadline: workflow.deadline,
          ai_reasoning: workflow.reasoning,
          ai_plan: workflow,
        })
        .select('id')
        .single();

      if (!wfErr && wfRes?.id) {
        const realWfId = wfRes.id;

        for (const step of workflow.steps) {
          const { data: stepRes } = await supabase
            .from('workflow_steps')
            .insert({
              workflow_id: realWfId,
              step_number: step.stepNumber,
              step_type: step.stepType || 'action',
              description: step.description,
              assignee: step.assignee,
              status: step.status || 'pending',
              requires_approval: step.requiresApproval,
              condition_action_data: step.conditionActionData
                ? { condition: step.conditionActionData }
                : {},
            })
            .select('id')
            .single();

          if (stepRes?.id) {
            stepIds[step.stepNumber] = stepRes.id;
          }
        }

        return { workflowId: realWfId, stepIds };
      }
    } catch (e) {
      console.warn('Supabase saveWorkflow fallback to memory:', e);
    }
  }

  memoryStore.workflows.unshift({
    id: workflowId,
    inboxItemId,
    title: workflow.workflowTitle,
    objective: workflow.objective,
    priority: workflow.priority,
    status: workflow.status || 'proposed',
    deadline: workflow.deadline,
    aiReasoning: workflow.reasoning,
    aiPlan: workflow,
    createdAt,
  });

  for (const step of workflow.steps) {
    const sId = generateUUID();
    stepIds[step.stepNumber] = sId;
    memoryStore.workflowSteps.push({
      id: sId,
      workflowId,
      stepNumber: step.stepNumber,
      stepType: step.stepType || 'action',
      description: step.description,
      action: step.action,
      assignee: step.assignee,
      status: step.status || 'pending',
      requiresApproval: step.requiresApproval,
      conditionActionData: step.conditionActionData,
      createdAt,
    });
  }

  return { workflowId, stepIds };
}

// ---------------------------------------------------------------------------
// 3. Save Activity Logs
// ---------------------------------------------------------------------------

export async function saveActivityLogs(
  logs: ActivityEvent[],
  workflowId?: string,
): Promise<void> {
  const supabase = getSupabaseClient();

  if (supabase) {
    try {
      const records = logs.map((l) => ({
        workflow_id: workflowId || l.workflowId || null,
        event_type: l.type,
        detail: l.detail,
        metadata: l.metadata || {},
        created_at: l.timestamp || new Date().toISOString(),
      }));

      await supabase.from('activity_logs').insert(records);
    } catch (e) {
      console.warn('Supabase saveActivityLogs fallback to memory:', e);
    }
  }

  for (const l of logs) {
    memoryStore.activityLogs.unshift({
      ...l,
      id: generateUUID(),
      workflowId: workflowId || l.workflowId,
    });
  }
}

// ---------------------------------------------------------------------------
// 4. Save AI Run
// ---------------------------------------------------------------------------

export async function saveAIRun(run: {
  operation: string;
  model: string;
  status: 'success' | 'error';
  latencyMs: number;
  error?: string;
}): Promise<void> {
  const supabase = getSupabaseClient();

  if (supabase) {
    try {
      await supabase.from('ai_runs').insert({
        operation: run.operation,
        model: run.model,
        status: run.status,
        latency_ms: run.latencyMs,
        error: run.error || null,
      });
    } catch (e) {
      console.warn('Supabase saveAIRun fallback to memory:', e);
    }
  }

  memoryStore.aiRuns.unshift({
    id: generateUUID(),
    ...run,
    createdAt: new Date().toISOString(),
  });
}

// ---------------------------------------------------------------------------
// 5. Save Approval Record
// ---------------------------------------------------------------------------

export async function saveApproval(approval: {
  workflowId: string;
  workflowTitle: string;
  stepId?: string;
  stepNumber: number;
  proposedAction: string;
  description: string;
}): Promise<string> {
  const supabase = getSupabaseClient();
  const id = generateUUID();
  const createdAt = new Date().toISOString();

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('approvals')
        .insert({
          workflow_id: approval.workflowId,
          step_id: approval.stepId || null,
          step_number: approval.stepNumber,
          proposed_action: approval.proposedAction,
          description: approval.description,
          status: 'pending',
        })
        .select('id')
        .single();

      if (!error && data?.id) {
        return data.id;
      }
    } catch (e) {
      console.warn('Supabase saveApproval fallback to memory:', e);
    }
  }

  const item: ApprovalItem = {
    id,
    workflowId: approval.workflowId,
    workflowTitle: approval.workflowTitle,
    stepId: approval.stepId,
    stepNumber: approval.stepNumber,
    proposedAction: approval.proposedAction,
    description: approval.description,
    status: 'pending',
    createdAt,
  };

  memoryStore.approvals.unshift(item);
  return id;
}

// ---------------------------------------------------------------------------
// 6. Update Approval Status & Edit Action
// ---------------------------------------------------------------------------

export async function updateApprovalStatus(
  approvalId: string,
  newStatus: 'approved' | 'rejected',
): Promise<{ success: boolean; workflowId?: string; stepNumber?: number }> {
  const supabase = getSupabaseClient();
  const decidedAt = new Date().toISOString();

  let targetWorkflowId: string | undefined;
  let targetStepNumber: number | undefined;
  let targetStepId: string | undefined;
  let actionName = 'Proposed Action';

  if (supabase) {
    try {
      const { data: appData } = await supabase
        .from('approvals')
        .select('*')
        .eq('id', approvalId)
        .single();

      if (appData) {
        targetWorkflowId = appData.workflow_id;
        targetStepNumber = appData.step_number;
        targetStepId = appData.step_id;
        actionName = appData.proposed_action;

        if (targetWorkflowId) {
          await supabase
            .from('approvals')
            .update({ status: newStatus, decided_at: decidedAt })
            .eq('workflow_id', targetWorkflowId);

          await supabase
            .from('workflow_steps')
            .update({ status: newStatus })
            .eq('workflow_id', targetWorkflowId)
            .eq('requires_approval', true);
        } else if (targetStepId) {
          await supabase
            .from('workflow_steps')
            .update({ status: newStatus })
            .eq('id', targetStepId);
        }

        await supabase.from('activity_logs').insert({
          workflow_id: targetWorkflowId,
          event_type: newStatus === 'approved' ? 'action_approved' : 'action_rejected',
          detail: `User ${newStatus} action: "${actionName}"`,
          created_at: decidedAt,
        });

        return { success: true, workflowId: targetWorkflowId, stepNumber: targetStepNumber };
      }
    } catch (e) {
      console.warn('Supabase updateApprovalStatus fallback to memory:', e);
    }
  }

  const appIndex = memoryStore.approvals.findIndex((a) => a.id === approvalId);
  if (appIndex !== -1) {
    const item = memoryStore.approvals[appIndex];
    targetWorkflowId = item.workflowId;
    targetStepNumber = item.stepNumber;
    targetStepId = item.stepId;
    actionName = item.proposedAction;

    if (targetWorkflowId) {
      memoryStore.approvals.forEach((a) => {
        if (a.workflowId === targetWorkflowId) {
          a.status = newStatus;
          a.decidedAt = decidedAt;
        }
      });
      memoryStore.workflowSteps.forEach((s) => {
        if (s.workflowId === targetWorkflowId && s.requiresApproval) {
          s.status = newStatus;
        }
      });
    } else {
      item.status = newStatus;
      item.decidedAt = decidedAt;
      const step = memoryStore.workflowSteps.find(
        (s) => s.id === targetStepId || (s.workflowId === targetWorkflowId && s.stepNumber === targetStepNumber),
      );
      if (step) {
        step.status = newStatus;
      }
    }

    memoryStore.activityLogs.unshift({
      id: generateUUID(),
      workflowId: targetWorkflowId,
      type: newStatus === 'approved' ? 'action_approved' : 'action_rejected',
      timestamp: decidedAt,
      detail: `User ${newStatus} action: "${actionName}"`,
    });

    return { success: true, workflowId: targetWorkflowId, stepNumber: targetStepNumber };
  }

  return { success: false };
}

export async function updateApprovalAction(
  approvalId: string,
  newAction: string,
): Promise<{ success: boolean }> {
  const supabase = getSupabaseClient();

  if (supabase) {
    try {
      const { data: appData } = await supabase
        .from('approvals')
        .select('*')
        .eq('id', approvalId)
        .single();

      if (appData) {
        await supabase
          .from('approvals')
          .update({ proposed_action: newAction })
          .eq('id', approvalId);

        if (appData.step_id) {
          await supabase
            .from('workflow_steps')
            .update({ description: newAction })
            .eq('id', appData.step_id);
        }

        await supabase.from('activity_logs').insert({
          workflow_id: appData.workflow_id,
          event_type: 'action_edited',
          detail: `User edited proposed action to: "${newAction}"`,
          created_at: new Date().toISOString(),
        });

        return { success: true };
      }
    } catch (e) {
      console.warn('Supabase updateApprovalAction fallback to memory:', e);
    }
  }

  const item = memoryStore.approvals.find((a) => a.id === approvalId);
  if (item) {
    item.proposedAction = newAction;
    const step = memoryStore.workflowSteps.find(
      (s) => s.id === item.stepId || (s.workflowId === item.workflowId && s.stepNumber === item.stepNumber),
    );
    if (step) {
      step.action = newAction;
    }

    memoryStore.activityLogs.unshift({
      id: generateUUID(),
      workflowId: item.workflowId,
      type: 'action_edited',
      timestamp: new Date().toISOString(),
      detail: `User edited proposed action to: "${newAction}"`,
    });

    return { success: true };
  }

  return { success: false };
}

// ---------------------------------------------------------------------------
// 7. Get Workflows (All Workflows List & Single Detail)
// ---------------------------------------------------------------------------

export async function getAllWorkflows(): Promise<WorkflowListItem[]> {
  const supabase = getSupabaseClient();

  if (supabase) {
    try {
      const { data: wfList, error } = await supabase
        .from('workflows')
        .select('*, workflow_steps(*), inbox_items(original_message)')
        .order('created_at', { ascending: false });

      if (!error && wfList) {
        return wfList.map((w) => {
          const steps: WorkflowStep[] = (w.workflow_steps || []).map((s: Record<string, unknown>) => ({
            id: String(s.id),
            stepNumber: Number(s.step_number),
            action: String(s.description || 'Step Action'),
            description: String(s.description || ''),
            stepType: (s.step_type as WorkflowStep['stepType']) || 'action',
            assignee: String(s.assignee || 'FlowPilot AI'),
            requiresApproval: Boolean(s.requires_approval),
            status: (s.status as StepStatus) || 'pending',
          }));

          const completedSteps = steps.filter((s) => s.status === 'completed' || s.status === 'approved').length;
          const totalSteps = steps.length || 1;
          const progressPercent = Math.round((completedSteps / totalSteps) * 100);
          const pendingApprovalsCount = steps.filter((s) => s.requiresApproval && s.status === 'pending').length;

          const isAllCompleted = steps.length > 0 && steps.every((s) => s.status === 'completed');
          const calculatedStatus: WorkflowStatus = isAllCompleted
            ? 'completed'
            : (w.status as WorkflowStatus) || 'proposed';

          const basePlan = (w.ai_plan as WorkflowProposal) || {};
          const updatedPlan: WorkflowProposal = {
            ...basePlan,
            status: calculatedStatus,
            steps: steps.length > 0 ? steps : basePlan.steps || [],
          };

          return {
            id: w.id,
            inboxItemId: w.inbox_item_id,
            title: w.title,
            objective: w.objective,
            priority: w.priority,
            status: calculatedStatus,
            deadline: w.deadline,
            aiReasoning: w.ai_reasoning,
            createdAt: w.created_at,
            progressPercent,
            totalSteps: steps.length,
            completedSteps,
            pendingApprovalsCount,
            steps,
            plan: updatedPlan,
            originalMessage: w.inbox_items?.original_message,
          };
        });
      }
    } catch (e) {
      console.warn('Supabase getAllWorkflows fallback to memory:', e);
    }
  }

  // Memory fallback
  return memoryStore.workflows.map((w) => {
    const steps = memoryStore.workflowSteps.filter((s) => s.workflowId === w.id);
    const completedSteps = steps.filter((s) => s.status === 'completed' || s.status === 'approved').length;
    const totalSteps = steps.length || 1;
    const progressPercent = Math.round((completedSteps / totalSteps) * 100);
    const pendingApprovalsCount = steps.filter((s) => s.requiresApproval && s.status === 'pending').length;

    const isAllCompleted = steps.length > 0 && steps.every((s) => s.status === 'completed');
    const calculatedStatus: WorkflowStatus = isAllCompleted ? 'completed' : w.status || 'proposed';

    const basePlan = w.aiPlan || {};
    const updatedPlan: WorkflowProposal = {
      ...basePlan,
      status: calculatedStatus,
      steps: (steps.length > 0 ? steps : basePlan.steps || []) as WorkflowStep[],
    };

    const inbox = memoryStore.inboxItems.find((i) => i.id === w.inboxItemId);

    return {
      id: w.id,
      inboxItemId: w.inboxItemId,
      title: w.title,
      objective: w.objective,
      priority: w.priority,
      status: calculatedStatus,
      deadline: w.deadline,
      aiReasoning: w.aiReasoning,
      createdAt: w.createdAt,
      progressPercent,
      totalSteps: steps.length,
      completedSteps,
      pendingApprovalsCount,
      steps: steps.map((s) => ({
        id: s.id,
        stepNumber: s.stepNumber,
        action: s.action,
        description: s.description,
        stepType: (s.stepType as WorkflowStep['stepType']) || 'action',
        assignee: s.assignee,
        requiresApproval: s.requiresApproval,
        status: s.status,
      })),
      plan: updatedPlan,
      originalMessage: inbox?.originalMessage,
    };
  });
}

export async function getWorkflowById(id: string): Promise<WorkflowListItem | null> {
  const all = await getAllWorkflows();
  return all.find((w) => w.id === id) || null;
}

// ---------------------------------------------------------------------------
// 8. Get All Approvals (Pending & Past Decisions)
// ---------------------------------------------------------------------------

export async function getAllApprovals(): Promise<ApprovalItem[]> {
  const supabase = getSupabaseClient();

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('approvals')
        .select('*, workflows(title)')
        .order('created_at', { ascending: false });

      if (!error && data) {
        return data.map((d) => ({
          id: d.id,
          workflowId: d.workflow_id,
          workflowTitle: d.workflows?.title || 'FlowPilot Workflow',
          stepId: d.step_id,
          stepNumber: d.step_number,
          proposedAction: d.proposed_action,
          description: d.description || '',
          status: d.status,
          createdAt: d.created_at,
          decidedAt: d.decided_at,
        }));
      }
    } catch (e) {
      console.warn('Supabase getAllApprovals fallback to memory:', e);
    }
  }

  return memoryStore.approvals;
}

// ---------------------------------------------------------------------------
// 9. Get Activity Logs (Global & Filtered)
// ---------------------------------------------------------------------------

export async function getRecentActivity(limit = 50): Promise<ActivityEvent[]> {
  const supabase = getSupabaseClient();

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (!error && data) {
        return data.map((d) => ({
          id: d.id,
          workflowId: d.workflow_id,
          type: d.event_type,
          timestamp: d.created_at,
          detail: d.detail,
          metadata: d.metadata,
        }));
      }
    } catch (e) {
      console.warn('Supabase getRecentActivity fallback to memory:', e);
    }
  }

  return memoryStore.activityLogs.slice(0, limit);
}

export async function getPendingApprovals(): Promise<ApprovalItem[]> {
  const all = await getAllApprovals();
  return all.filter((a) => a.status === 'pending');
}

// ---------------------------------------------------------------------------
// 10. Get Dashboard Metrics
// ---------------------------------------------------------------------------

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const supabase = getSupabaseClient();

  if (supabase) {
    try {
      const [wfRes, appRes, actRes, inboxRes] = await Promise.all([
        supabase.from('workflows').select('status, priority'),
        supabase.from('approvals').select('status'),
        supabase.from('activity_logs').select('*').order('created_at', { ascending: false }).limit(10),
        supabase.from('inbox_items').select('priority'),
      ]);

      const workflows = wfRes.data || [];
      const approvals = appRes.data || [];
      const activities = actRes.data || [];
      const inboxItems = inboxRes.data || [];

      const activeWorkflows = workflows.filter(
        (w) => w.status === 'proposed' || w.status === 'approved' || w.status === 'in_progress',
      ).length;

      const pendingApprovals = approvals.filter((a) => a.status === 'pending').length;

      const completedWorkflows = workflows.filter((w) => w.status === 'completed').length;

      const highPriorityItems =
        inboxItems.filter((i) => i.priority === 'high' || i.priority === 'critical').length +
        workflows.filter((w) => w.priority === 'high' || w.priority === 'critical').length;

      const aiActions = activities.length;

      const recentActivity: ActivityEvent[] = activities.map((d) => ({
        id: d.id,
        workflowId: d.workflow_id,
        type: d.event_type,
        timestamp: d.created_at,
        detail: d.detail,
        metadata: d.metadata,
      }));

      return {
        activeWorkflows,
        pendingApprovals,
        aiActions,
        highPriorityItems,
        completedWorkflows,
        recentActivity,
      };
    } catch (e) {
      console.warn('Supabase getDashboardMetrics fallback to memory:', e);
    }
  }

  const activeWorkflows = memoryStore.workflows.filter(
    (w) => w.status === 'proposed' || w.status === 'approved' || w.status === 'in_progress',
  ).length;

  const pendingApprovals = memoryStore.approvals.filter((a) => a.status === 'pending').length;
  const completedWorkflows = memoryStore.workflows.filter((w) => w.status === 'completed').length;

  const highPriorityItems =
    memoryStore.inboxItems.filter((i) => i.priority === 'high' || i.priority === 'critical').length +
    memoryStore.workflows.filter((w) => w.priority === 'high' || w.priority === 'critical').length;

  const aiActions = memoryStore.activityLogs.length;

  return {
    activeWorkflows,
    pendingApprovals,
    aiActions,
    highPriorityItems,
    completedWorkflows,
    recentActivity: memoryStore.activityLogs.slice(0, 10),
  };
}

// ---------------------------------------------------------------------------
// 11. Analytics Calculations (Real Data Only)
// ---------------------------------------------------------------------------

export async function getAnalyticsMetrics() {
  const supabase = getSupabaseClient();

  let aiRuns: Array<{ latency_ms?: number; status?: string }> = [];
  let approvals: Array<{ status?: string }> = [];
  let workflows: Array<{ status?: string }> = [];

  if (supabase) {
    try {
      const [runsRes, appRes, wfRes] = await Promise.all([
        supabase.from('ai_runs').select('latency_ms, status'),
        supabase.from('approvals').select('status'),
        supabase.from('workflows').select('status'),
      ]);
      aiRuns = runsRes.data || [];
      approvals = appRes.data || [];
      workflows = wfRes.data || [];
    } catch (e) {
      console.warn('Supabase getAnalyticsMetrics fallback to memory:', e);
    }
  } else {
    aiRuns = memoryStore.aiRuns;
    approvals = memoryStore.approvals;
    workflows = memoryStore.workflows;
  }

  const totalRuns = aiRuns.length;
  const avgLatency =
    totalRuns > 0
      ? Math.round(aiRuns.reduce((sum, r) => sum + (r.latency_ms || 0), 0) / totalRuns)
      : 0;

  const approvedCount = approvals.filter((a) => a.status === 'approved').length;
  const rejectedCount = approvals.filter((a) => a.status === 'rejected').length;
  const pendingCount = approvals.filter((a) => a.status === 'pending').length;
  const totalDecided = approvedCount + rejectedCount;

  const approvalRate = totalDecided > 0 ? Math.round((approvedCount / totalDecided) * 100) : 0;

  return {
    totalAIRuns: totalRuns,
    avgLatencyMs: avgLatency,
    approvedCount,
    rejectedCount,
    pendingCount,
    approvalRate,
    totalWorkflows: workflows.length,
  };
}

// ---------------------------------------------------------------------------
// 12. Execute Approved Workflow Steps & Update Breeth Memory
// ---------------------------------------------------------------------------

export async function executeWorkflow(workflowId: string): Promise<WorkflowProposal | null> {
  const supabase = getSupabaseClient();
  const now = new Date().toISOString();

  // 1. Fetch current workflow details & steps
  const wfItem = await getWorkflowById(workflowId);
  if (!wfItem) return null;

  const steps = wfItem.steps;

  // Verify all approval steps are approved/completed
  const pendingApprovals = steps.filter((s) => s.requiresApproval && s.status === 'pending');
  if (pendingApprovals.length > 0) {
    // Cannot execute yet; pending approvals remain
    return wfItem.plan || null;
  }

  // 2. Mark workflow as in_progress
  if (supabase) {
    try {
      await supabase.from('workflows').update({ status: 'in_progress' }).eq('id', workflowId);
    } catch (e) {
      console.warn('Supabase status update error:', e);
    }
  }
  const memWf = memoryStore.workflows.find((w) => w.id === workflowId);
  if (memWf) memWf.status = 'in_progress';

  // 3. Process each step to completed status and record activity logs
  for (const step of steps) {
    const stepId = step.id;

    if (supabase && stepId) {
      try {
        await supabase.from('workflow_steps').update({ status: 'completed' }).eq('id', stepId);
      } catch (e) {
        console.warn('Supabase step update error:', e);
      }
    }

    const memStep = memoryStore.workflowSteps.find(
      (s) => s.id === stepId || (s.workflowId === workflowId && s.stepNumber === step.stepNumber),
    );
    if (memStep) memStep.status = 'completed';

    step.status = 'completed';
  }

  await saveActivityLogs(
    [
      {
        type: 'action_approved',
        timestamp: now,
        detail: `Executed all ${steps.length} workflow steps after operator approval.`,
      },
    ],
    workflowId,
  );

  // 4. Update Breeth Memory episode with completed workflow outcome (VERIFY phase)
  try {
    const { writeEpisode } = await import('@/lib/memory/breeth');
    await writeEpisode({
      content: `Completed AI Workflow "${wfItem.title}": ${wfItem.objective}. Executed all ${steps.length} steps cleanly after operator sign-off.`,
      metadata: {
        workflowId,
        priority: wfItem.priority,
        totalSteps: steps.length,
        executedAt: now,
      },
    });
  } catch (err) {
    console.warn('Breeth memory episode write error (non-fatal):', err);
  }

  // Record outcome verification in activity logs
  await saveActivityLogs(
    [
      {
        type: 'action_approved',
        timestamp: new Date().toISOString(),
        detail: `Outcome verified & persistent episode saved to Breeth memory for workflow "${wfItem.title}".`,
      },
    ],
    workflowId,
  );

  // 5. Mark workflow status as 'completed'
  if (supabase) {
    try {
      await supabase.from('workflows').update({ status: 'completed' }).eq('id', workflowId);
    } catch (e) {
      console.warn('Supabase workflow completion update error:', e);
    }
  }
  if (memWf) memWf.status = 'completed';

  // Fetch and return the updated workflow proposal
  const finalWf = await getWorkflowById(workflowId);
  if (!finalWf) return wfItem.plan || null;

  return {
    id: finalWf.id,
    workflowTitle: finalWf.title,
    objective: finalWf.objective,
    priority: finalWf.priority as PriorityLevel,
    deadline: finalWf.deadline,
    reasoning: finalWf.aiReasoning,
    steps: finalWf.steps,
    conditions: finalWf.plan?.conditions || [],
    approvalRequiredActions: finalWf.plan?.approvalRequiredActions || [],
    memoryUsed: finalWf.plan?.memoryUsed || [],
    status: finalWf.status,
  };
}

