'use client';

import React, { useState } from 'react';
import type { PipelineResponse } from '@/lib/types';
import styles from './CycleBanner.module.css';

interface CycleBannerProps {
  activeStage?: string;
  loading?: boolean;
  result?: PipelineResponse | null;
}

interface StageItem {
  id: string;
  label: string;
  icon: string;
  desc: string;
  details: (result: PipelineResponse | null, loading: boolean) => string;
}

const COMMAND_CENTER_STAGES: StageItem[] = [
  {
    id: 'understand',
    label: 'UNDERSTAND',
    icon: '🧠',
    desc: 'Extract Intent & Entities',
    details: (r, loading) =>
      loading
        ? 'Extracting intent and customer entities via Gemini...'
        : r?.extraction
        ? `Intent: ${r.extraction.intent} | Priority: ${r.extraction.priority.toUpperCase()}`
        : 'Processes raw message into structured JSON intent.',
  },
  {
    id: 'remember',
    label: 'REMEMBER',
    icon: '💾',
    desc: 'Breeth Context Search',
    details: (r, loading) =>
      loading
        ? 'Querying Breeth memory store for relevant facts...'
        : r?.memorySearch && r.memorySearch.memories.length > 0
        ? `Retrieved ${r.memorySearch.memories.length} memory fact(s) (${(r.memorySearch.memories[0].score * 100).toFixed(0)}% match)`
        : 'Searches persistent customer memory and historical preferences.',
  },
  {
    id: 'reason',
    label: 'REASON',
    icon: '⚡',
    desc: 'Gemini Strategy Synthesis',
    details: (r, loading) =>
      loading
        ? 'Synthesizing strategic reasoning with Gemini...'
        : r?.workflow?.reasoning
        ? 'Synthesized strategic reasoning combining memory + intent.'
        : 'Forms executive reasoning using business context.',
  },
  {
    id: 'plan',
    label: 'PLAN',
    icon: '📋',
    desc: 'Workflow Step Construction',
    details: (r, loading) =>
      loading
        ? 'Constructing execution steps...'
        : r?.workflow?.steps
        ? `${r.workflow.steps.length} execution step(s) constructed with assignees.`
        : 'Generates step-by-step execution roadmap.',
  },
  {
    id: 'approve',
    label: 'APPROVE',
    icon: '🛡️',
    desc: 'Human Sign-off Guardrail',
    details: (r) =>
      r?.workflow?.steps.some((s) => s.requiresApproval)
        ? 'Human approval required before consequential action.'
        : 'Safeguards execution with human sign-off.',
  },
  {
    id: 'act',
    label: 'ACT',
    icon: '🚀',
    desc: 'Safe Action Execution',
    details: (r) =>
      r?.workflow
        ? 'Queued for safe execution upon approval.'
        : 'Executes approved actions with external services.',
  },
  {
    id: 'verify',
    label: 'VERIFY',
    icon: '🔍',
    desc: 'Audit Trail & Memory Update',
    details: (r) =>
      r?.activityLog && r.activityLog.length > 0
        ? `Logged ${r.activityLog.length} telemetry event(s) to database.`
        : 'Verifies outcomes & updates persistent Breeth episode memory.',
  },
];

export const CycleBanner: React.FC<CycleBannerProps> = ({
  activeStage = 'understand',
  loading = false,
  result = null,
}) => {
  const [expandedStage, setExpandedStage] = useState<string | null>(null);

  const getStageStatus = (stageId: string) => {
    if (loading) {
      if (stageId === 'understand' || stageId === 'remember' || stageId === 'reason') {
        return { text: '● Processing', className: styles.statusProcessing };
      }
      return { text: '○ Queued', className: styles.statusQueued };
    }

    if (result) {
      const steps = result.workflow?.steps ?? [];

      // Which steps require human approval?
      const approvalSteps = steps.filter((s) => s.requiresApproval);
      const allApproved = approvalSteps.length > 0 && approvalSteps.every((s) => s.status === 'approved');
      const anyRejected = approvalSteps.some((s) => s.status === 'rejected');
      const anyPending = approvalSteps.some((s) => s.status === 'pending');

      if (stageId === 'understand') {
        return result.extraction
          ? { text: '✓ Done', className: styles.statusDone }
          : { text: '○ Idle', className: styles.statusIdle };
      }

      if (stageId === 'remember') {
        return { text: '✓ Done', className: styles.statusDone };
      }

      if (stageId === 'reason') {
        return result.workflow
          ? { text: '✓ Done', className: styles.statusDone }
          : { text: '○ Idle', className: styles.statusIdle };
      }

      if (stageId === 'plan') {
        return result.workflow
          ? { text: '✓ Done', className: styles.statusDone }
          : { text: '○ Idle', className: styles.statusIdle };
      }

      if (stageId === 'approve') {
        if (!result.workflow) return { text: '○ Idle', className: styles.statusIdle };
        if (approvalSteps.length === 0) {
          // No steps require approval — auto-pass
          return { text: '✓ Done', className: styles.statusDone };
        }
        if (anyRejected) {
          return { text: '✗ Rejected', className: styles.statusPending };
        }
        if (allApproved) {
          return { text: '✓ Done', className: styles.statusDone };
        }
        // Some are still pending
        return { text: '🛡️ Pending', className: styles.statusPending };
      }

      if (stageId === 'act') {
        if (!result.workflow) return { text: '○ Idle', className: styles.statusIdle };
        if (anyRejected) {
          return { text: '✗ Blocked', className: styles.statusPending };
        }
        if (anyPending) {
          // Blocked until all approvals complete
          return { text: '○ Waiting', className: styles.statusQueued };
        }

        const actionSteps = steps.filter(
          (s) => s.stepType === 'action' || s.stepType === 'wait' || s.stepType === 'decision',
        );
        const allActionCompleted =
          (actionSteps.length > 0 && actionSteps.every((s) => s.status === 'completed')) ||
          result.workflow.status === 'completed';
        const anyActionExecuting =
          steps.some((s) => s.status === 'executing') || result.workflow.status === 'in_progress';

        if (allActionCompleted) {
          return { text: '✓ Done', className: styles.statusDone };
        }
        if (anyActionExecuting) {
          return { text: '● Executing', className: styles.statusProcessing };
        }
        if (allApproved || approvalSteps.length === 0) {
          return { text: '⚡ Ready', className: styles.statusReady };
        }
        return { text: '○ Waiting', className: styles.statusQueued };
      }

      if (stageId === 'verify') {
        if (!result.workflow) return { text: '○ Idle', className: styles.statusIdle };
        if (anyRejected) {
          return { text: '✗ Skipped', className: styles.statusPending };
        }
        if (anyPending) {
          return { text: '○ Waiting', className: styles.statusQueued };
        }

        const isCompleted =
          result.workflow.status === 'completed' || steps.every((s) => s.status === 'completed');
        if (isCompleted) {
          return { text: '✓ Done', className: styles.statusDone };
        }

        const actionSteps = steps.filter(
          (s) => s.stepType === 'action' || s.stepType === 'wait' || s.stepType === 'decision',
        );
        const allActionCompleted =
          actionSteps.length > 0 && actionSteps.every((s) => s.status === 'completed');
        const anyExecuting =
          steps.some((s) => s.status === 'executing') || result.workflow.status === 'in_progress';

        if (anyExecuting) {
          return { text: '🔍 Verifying', className: styles.statusProcessing };
        }
        if (allActionCompleted) {
          return { text: '⚡ Ready', className: styles.statusReady };
        }
        if (allApproved || approvalSteps.length === 0) {
          return { text: '⏳ Waiting', className: styles.statusQueued };
        }
        return { text: '○ Waiting', className: styles.statusQueued };
      }
    }

    if (activeStage === stageId) {
      return { text: '● Active', className: styles.statusActive };
    }

    return { text: '○ Idle', className: styles.statusIdle };
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerTitleRow}>
          <span className={styles.badge}>FLOWPILOT COMMAND CENTER</span>
          <h2 className={styles.title}>Autonomous AI Employee Execution Loop</h2>
        </div>
        <div className={styles.liveIndicator}>
          <span className={styles.pulseDot} />
          <span className={styles.liveText}>
            {loading
              ? 'AI Reasoning Engine Active…'
              : result?.workflow
              ? (() => {
                  const steps = result.workflow?.steps ?? [];
                  const approvalSteps = steps.filter((s) => s.requiresApproval);
                  if (approvalSteps.some((s) => s.status === 'rejected')) return 'Workflow Rejected by Operator';
                  if (approvalSteps.some((s) => s.status === 'pending')) return 'Awaiting Human Approval…';
                  if (result.workflow?.status === 'completed' || steps.every((s) => s.status === 'completed')) return 'Pipeline Complete — Memory Updated';
                  if (result.workflow?.status === 'in_progress' || steps.some((s) => s.status === 'executing')) return 'Executing Action & Updating Memory…';
                  if (approvalSteps.length === 0 || approvalSteps.every((s) => s.status === 'approved')) return 'Action Ready — Executing';
                  return 'Pipeline Running';
                })()
              : result
              ? 'Engine Ready'
              : 'Engine Ready'}
          </span>
        </div>
      </div>

      <div className={styles.cycleGrid}>
        {COMMAND_CENTER_STAGES.map((stage, idx) => {
          const status = getStageStatus(stage.id);
          const isSelected = expandedStage === stage.id;
          const isActive = loading
            ? (stage.id === 'understand' || stage.id === 'remember' || stage.id === 'reason')
            : (result || activeStage === stage.id);

          return (
            <React.Fragment key={stage.id}>
              <div
                className={`${styles.node} ${isActive ? styles.activeNode : ''} ${
                  isSelected ? styles.selectedNode : ''
                }`}
                onClick={() => setExpandedStage(isSelected ? null : stage.id)}
                title="Click to toggle stage details"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    setExpandedStage(isSelected ? null : stage.id);
                  }
                }}
              >
                <div className={styles.nodeHeader}>
                  <span className={styles.nodeIcon}>{stage.icon}</span>
                  <span className={`${styles.statusBadge} ${status.className}`}>{status.text}</span>
                </div>
                <div className={styles.nodeLabel}>{stage.label}</div>
                <div className={styles.nodeDesc}>{stage.desc}</div>
              </div>

              {idx < COMMAND_CENTER_STAGES.length - 1 && (
                <div className={styles.arrow}>
                  <span>→</span>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Expanded Stage Context Panel */}
      {expandedStage && (
        <div className={styles.expandedPanel}>
          {COMMAND_CENTER_STAGES.filter((s) => s.id === expandedStage).map((stage) => (
            <div key={stage.id} className={styles.expandedContent}>
              <div className={styles.expandedTitle}>
                <span>{stage.icon}</span>
                <strong>{stage.label} Stage Detail:</strong> {stage.desc}
              </div>
              <p className={styles.expandedText}>{stage.details(result, loading)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
