// =============================================================================
// FlowPilot AI Pipeline — Shared Types
// =============================================================================

export type PriorityLevel = 'low' | 'medium' | 'high' | 'critical';
export type StepStatus = 'pending' | 'approved' | 'rejected' | 'executing' | 'completed';
export type WorkflowStatus = 'proposed' | 'approved' | 'rejected' | 'in_progress' | 'completed';

export type StepType = 'trigger' | 'context' | 'action' | 'approval' | 'wait' | 'decision';

/** Result from Gemini structured extraction (step 1) */
export interface ExtractedIntent {
  intent: string;
  contact: string;
  company: string;
  summary: string;
  priority: PriorityLevel;
  deadline: string;
  requestedAction: string;
  conditions: string[];
  entities: string[];
  workflowRequirements: string[];
}

/** A single memory fact retrieved from Breeth */
export interface BreethMemory {
  id: string;
  content: string;
  score: number;
  metadata?: Record<string, unknown>;
}

/** Result from Breeth memory search */
export interface BreethSearchResult {
  query: string;
  memories: BreethMemory[];
  totalResults: number;
}

/** A single step in the generated workflow */
export interface WorkflowStep {
  id?: string;
  stepNumber: number;
  action: string;
  description: string;
  stepType: StepType;
  assignee: string;
  requiresApproval: boolean;
  status: StepStatus;
  conditionActionData?: string;
}

/** The final structured workflow proposal from the pipeline */
export interface WorkflowProposal {
  id?: string;
  workflowTitle: string;
  objective: string;
  priority: PriorityLevel;
  deadline: string;
  reasoning: string;
  steps: WorkflowStep[];
  conditions: string[];
  approvalRequiredActions: string[];
  memoryUsed: string[];
  status?: WorkflowStatus;
}

/** Activity event for logging */
export type ActivityEventType =
  | 'message_received'
  | 'intent_identified'
  | 'memory_searched'
  | 'memory_retrieved'
  | 'workflow_generated'
  | 'approval_requested'
  | 'action_approved'
  | 'action_rejected'
  | 'action_edited'
  | 'error';

export interface ActivityEvent {
  id?: string;
  workflowId?: string;
  type: ActivityEventType;
  timestamp: string;
  detail: string;
  metadata?: Record<string, unknown>;
}

/** Full pipeline response returned to the UI */
export interface PipelineResponse {
  success: boolean;
  inboxItemId?: string;
  workflowId?: string;
  extraction: ExtractedIntent | null;
  memorySearch: BreethSearchResult | null;
  workflow: WorkflowProposal | null;
  activityLog: ActivityEvent[];
  /** Maps stepNumber → real approval record ID (from the approvals table) */
  approvalIdMap?: Record<number, string>;
  error?: string;
}

/** Approval Item for consequential actions */
export interface ApprovalItem {
  id: string;
  workflowId: string;
  workflowTitle: string;
  stepId?: string;
  stepNumber: number;
  proposedAction: string;
  description: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  decidedAt?: string;
}

/** Inbox record persisted in DB */
export interface InboxItemRecord {
  id: string;
  originalMessage: string;
  aiIntent: string;
  aiSummary: string;
  priority: PriorityLevel;
  extractedData: ExtractedIntent;
  createdAt: string;
}

/** AI Run tracking record */
export interface AIRunRecord {
  id: string;
  operation: string;
  model: string;
  status: 'success' | 'error';
  latencyMs: number;
  error?: string;
  createdAt: string;
}

/** Dashboard Summary Metrics */
export interface DashboardMetrics {
  activeWorkflows: number;
  pendingApprovals: number;
  aiActions: number;
  highPriorityItems: number;
  completedWorkflows: number;
  recentActivity: ActivityEvent[];
}

