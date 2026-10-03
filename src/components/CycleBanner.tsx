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
      if (stageId === 'understand' && result.extraction) return { text: '✓ Done', className: styles.statusDone };
      if (stageId === 'remember') return { text: '✓ Done', className: styles.statusDone };
      if (stageId === 'reason' && result.workflow) return { text: '✓ Done', className: styles.statusDone };
      if (stageId === 'plan' && result.workflow) return { text: '✓ Done', className: styles.statusDone };
      if (stageId === 'approve' && result.workflow) return { text: '🛡️ Pending', className: styles.statusPending };
      if (stageId === 'act') return { text: '⚡ Ready', className: styles.statusReady };
      if (stageId === 'verify') return { text: '✓ Logged', className: styles.statusDone };
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
            {loading ? 'AI Reasoning Engine Active…' : result ? 'Pipeline Execution Complete' : 'Engine Ready'}
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
