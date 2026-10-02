'use client';

import React, { useState, useEffect } from 'react';
import type { WorkflowListItem } from '@/lib/db';
import { WorkflowNodeFlow } from './WorkflowNodeFlow';
import styles from './WorkflowsCenter.module.css';

interface WorkflowsCenterProps {
  onOpenApproval?: (workflowId: string) => void;
}

export const WorkflowsCenter: React.FC<WorkflowsCenterProps> = ({ onOpenApproval }) => {
  const [workflows, setWorkflows] = useState<WorkflowListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowListItem | null>(null);

  const fetchWorkflows = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/workflows');
      const data = await res.json();
      if (data.success && data.workflows) {
        setWorkflows(data.workflows);
        if (data.workflows.length > 0 && !selectedWorkflow) {
          setSelectedWorkflow(data.workflows[0]);
        }
      }
    } catch (e) {
      console.warn('Failed to fetch workflows:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    fetch('/api/workflows')
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data.success && data.workflows) {
          setWorkflows(data.workflows);
          if (data.workflows.length > 0) {
            setSelectedWorkflow((prev) => prev || data.workflows[0]);
          }
        }
      })
      .catch((e) => console.warn('Failed to fetch workflows:', e))
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <span className={styles.headerBadge}>REAL SUPABASE PERSISTENCE</span>
          <h2 className={styles.title}>Workflow Control Center</h2>
          <p className={styles.subtitle}>
            Monitor, inspect, and manage autonomous AI workflow executions.
          </p>
        </div>

        <button className={styles.refreshBtn} onClick={fetchWorkflows}>
          🔄 Refresh Workflows
        </button>
      </div>

      {loading ? (
        <div className={styles.loadingBox}>
          <div className={styles.spinner} />
          <span>Fetching real Supabase workflow records...</span>
        </div>
      ) : workflows.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>⚡</div>
          <h3>No Workflows Found</h3>
          <p>
            Go to the <strong>AI Inbox</strong> to paste a work message and generate your first AI workflow!
          </p>
        </div>
      ) : (
        <div className={styles.mainGrid}>
          {/* Left Column: Workflows List Cards */}
          <div className={styles.listColumn}>
            <h3 className={styles.listHeader}>Workflows ({workflows.length})</h3>

            <div className={styles.cardsContainer}>
              {workflows.map((wf) => {
                const isSelected = selectedWorkflow?.id === wf.id;

                return (
                  <div
                    key={wf.id}
                    className={`${styles.wfCard} ${isSelected ? styles.selectedCard : ''}`}
                    onClick={() => setSelectedWorkflow(wf)}
                  >
                    <div className={styles.cardHeader}>
                      <span className={`${styles.statusBadge} ${styles[`status_${wf.status}`]}`}>
                        {wf.status.replace(/_/g, ' ').toUpperCase()}
                      </span>
                      <span className={`${styles.priorityBadge} ${styles[`priority_${wf.priority}`]}`}>
                        {wf.priority.toUpperCase()}
                      </span>
                    </div>

                    <h4 className={styles.cardTitle}>{wf.title}</h4>
                    <p className={styles.cardObjective}>{wf.objective}</p>

                    {/* Progress Bar */}
                    <div className={styles.progressSection}>
                      <div className={styles.progressTop}>
                        <span>Progress</span>
                        <span>{wf.progressPercent}%</span>
                      </div>
                      <div className={styles.progressBarBg}>
                        <div
                          className={styles.progressBarFill}
                          style={{ width: `${wf.progressPercent}%` }}
                        />
                      </div>
                    </div>

                    <div className={styles.cardFooter}>
                      <span>{wf.totalSteps} Steps</span>
                      {wf.pendingApprovalsCount > 0 && (
                        <span className={styles.pendingBadge}>
                          🛡️ {wf.pendingApprovalsCount} Approval Pending
                        </span>
                      )}
                      <span>⏳ {wf.deadline}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Workflow Detail & Connected Node Flow */}
          {selectedWorkflow && (
            <div className={styles.detailColumn}>
              <div className={styles.detailCard}>
                <div className={styles.detailHeader}>
                  <div>
                    <span className={styles.detailBadge}>WORKFLOW DETAIL INSPECTOR</span>
                    <h3 className={styles.detailTitle}>{selectedWorkflow.title}</h3>
                    <p className={styles.detailObj}>{selectedWorkflow.objective}</p>
                  </div>
                  <div className={styles.detailMeta}>
                    <span className={`${styles.statusBadge} ${styles[`status_${selectedWorkflow.status}`]}`}>
                      STATUS: {selectedWorkflow.status.toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Section 3: Visual Connected Nodes */}
                <WorkflowNodeFlow
                  currentStepIndex={selectedWorkflow.completedSteps || 2}
                  completedStepsCount={selectedWorkflow.completedSteps || 2}
                />

                {/* Reasoning */}
                {selectedWorkflow.aiReasoning && (
                  <div className={styles.reasoningBox}>
                    <strong>🧠 AI Strategic Reasoning:</strong>
                    <p>{selectedWorkflow.aiReasoning}</p>
                  </div>
                )}

                {/* Visual Step-by-Step Breakdown */}
                <div className={styles.stepsBreakdown}>
                  <h4 className={styles.breakdownHeader}>
                    Workflow Execution Steps ({selectedWorkflow.steps.length})
                  </h4>

                  <div className={styles.stepsList}>
                    {selectedWorkflow.steps.map((step) => (
                      <div key={step.stepNumber} className={styles.stepRow}>
                        <div className={styles.stepNum}>{step.stepNumber}</div>

                        <div className={styles.stepBody}>
                          <div className={styles.stepTitleRow}>
                            <span className={styles.stepAction}>{step.action}</span>
                            <span className={styles.stepTypeTag}>
                              {(step.stepType || 'action').toUpperCase()}
                            </span>
                            <span className={`${styles.stepStatusTag} ${styles[`status_${step.status}`]}`}>
                              {step.status}
                            </span>
                          </div>

                          <p className={styles.stepDesc}>{step.description}</p>

                          <div className={styles.stepMetaRow}>
                            <span>Assignee: {step.assignee}</span>
                            {step.requiresApproval && (
                              <span className={styles.approvalReq}>
                                🔒 Requires Human Approval
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {selectedWorkflow.pendingApprovalsCount > 0 && onOpenApproval && (
                  <div className={styles.approvalBanner}>
                    <span>🛡️ Action items in this workflow require human approval.</span>
                    <button
                      className={styles.openApprovalBtn}
                      onClick={() => onOpenApproval(selectedWorkflow.id)}
                    >
                      Open Approval Center →
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
