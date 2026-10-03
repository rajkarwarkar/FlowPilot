'use client';

import React, { useState } from 'react';
import type { WorkflowProposal, WorkflowStep } from '@/lib/types';
import styles from './WorkflowProposalCard.module.css';

interface WorkflowProposalCardProps {
  workflow: WorkflowProposal;
  approvalIdMap?: Record<number, string>;
  onApprovalDecision?: (
    approvalId: string,
    action: 'approved' | 'rejected',
    stepNumber: number,
  ) => Promise<void>;
  onEditStepAction?: (stepNumber: number, newAction: string) => void;
}

export const WorkflowProposalCard: React.FC<WorkflowProposalCardProps> = ({
  workflow,
  approvalIdMap = {},
  onApprovalDecision,
  onEditStepAction,
}) => {
  const [stepStates, setStepStates] = useState<Record<number, { status: string; action: string }>>({});
  const [editingStep, setEditingStep] = useState<number | null>(null);
  const [editInputValue, setEditInputValue] = useState('');
  const [loadingStep, setLoadingStep] = useState<number | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message: msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const getStepStatus = (step: WorkflowStep) => {
    return stepStates[step.stepNumber]?.status || step.status || 'pending';
  };

  const getStepAction = (step: WorkflowStep) => {
    return stepStates[step.stepNumber]?.action || step.action;
  };

  const handleApprove = async (step: WorkflowStep) => {
    setLoadingStep(step.stepNumber);
    try {
      const approvalId = approvalIdMap[step.stepNumber] || `app-${step.stepNumber}`;
      if (onApprovalDecision) {
        await onApprovalDecision(approvalId, 'approved', step.stepNumber);
      }
      setStepStates((prev) => ({
        ...prev,
        [step.stepNumber]: {
          status: 'approved',
          action: getStepAction(step),
        },
      }));
      showToast(`Action approved for Step ${step.stepNumber}: "${getStepAction(step)}"`, 'success');
    } catch {
      showToast('Failed to record approval decision.', 'error');
    } finally {
      setLoadingStep(null);
    }
  };

  const handleReject = async (step: WorkflowStep) => {
    setLoadingStep(step.stepNumber);
    try {
      const approvalId = approvalIdMap[step.stepNumber] || `app-${step.stepNumber}`;
      if (onApprovalDecision) {
        await onApprovalDecision(approvalId, 'rejected', step.stepNumber);
      }
      setStepStates((prev) => ({
        ...prev,
        [step.stepNumber]: {
          status: 'rejected',
          action: getStepAction(step),
        },
      }));
      showToast(`Action rejected for Step ${step.stepNumber}`, 'error');
    } catch {
      showToast('Failed to record rejection decision.', 'error');
    } finally {
      setLoadingStep(null);
    }
  };

  const handleStartEdit = (step: WorkflowStep) => {
    setEditingStep(step.stepNumber);
    setEditInputValue(getStepAction(step));
  };

  const handleSaveEdit = (step: WorkflowStep) => {
    if (!editInputValue.trim()) return;
    setStepStates((prev) => ({
      ...prev,
      [step.stepNumber]: {
        status: getStepStatus(step),
        action: editInputValue.trim(),
      },
    }));
    if (onEditStepAction) {
      onEditStepAction(step.stepNumber, editInputValue.trim());
    }
    setEditingStep(null);
    showToast(`Step ${step.stepNumber} action updated to: "${editInputValue.trim()}"`, 'success');
  };

  return (
    <div className={styles.card}>
      {/* Toast Notification */}
      {notification && (
        <div className={`${styles.toast} ${styles[`toast_${notification.type}`]}`}>
          {notification.type === 'success' ? '✅' : '❌'} {notification.message}
        </div>
      )}

      <div className={styles.cardHeader}>
        <div>
          <div className={styles.proposalBadge}>AI GENERATED WORKFLOW</div>
          <h3 className={styles.workflowTitle}>{workflow.workflowTitle}</h3>
          <p className={styles.objective}>{workflow.objective}</p>
        </div>
        <div className={styles.headerMeta}>
          <span className={`${styles.priorityBadge} ${styles[`priority_${workflow.priority}`]}`}>
            {workflow.priority.toUpperCase()} PRIORITY
          </span>
          <span className={styles.deadlineBadge}>⏳ {workflow.deadline}</span>
        </div>
      </div>

      {/* "WHY DID FLOWPILOT DECIDE THIS?" Expandable Reasoning Panel */}
      <div className={styles.reasoningBox}>
        <div className={styles.reasoningHeader}>
          <div className={styles.reasoningTitle}>
            <span>🧠 Why Did FlowPilot Decide This?</span>
          </div>
        </div>
        <p className={styles.reasoningText}>{workflow.reasoning}</p>

        {/* Structured Decision Factors Breakdown */}
        <div className={styles.decisionFactors}>
          <div className={styles.factorItem}>
            <span className={styles.factorIcon}>🏢</span>
            <span>Customer preference & context retrieved from Breeth memory</span>
          </div>
          <div className={styles.factorItem}>
            <span className={styles.factorIcon}>🎯</span>
            <span>Priority level calculated as <strong>{workflow.priority.toUpperCase()}</strong></span>
          </div>
          <div className={styles.factorItem}>
            <span className={styles.factorIcon}>⏳</span>
            <span>Execution scheduled for <strong>{workflow.deadline}</strong></span>
          </div>
          <div className={styles.factorItem}>
            <span className={styles.factorIcon}>🛡️</span>
            <span>Human-in-the-loop sign-off required for consequential steps</span>
          </div>
        </div>
      </div>

      {/* Visual Workflow Steps */}
      <div className={styles.stepsSection}>
        <h4 className={styles.stepsHeader}>
          <span>⚡ Execution Workflow Plan ({workflow.steps.length} Steps)</span>
        </h4>

        <div className={styles.stepsContainer}>
          {workflow.steps.map((step, index) => {
            const currentStatus = getStepStatus(step);
            const currentAction = getStepAction(step);
            const isEditing = editingStep === step.stepNumber;
            const isLoading = loadingStep === step.stepNumber;
            const isConsequential = Boolean(step.requiresApproval);

            return (
              <div
                key={step.stepNumber}
                className={`${styles.stepCard} ${styles[`stepType_${step.stepType || 'action'}`]} ${
                  currentStatus === 'approved' ? styles.approvedStep : ''
                } ${currentStatus === 'rejected' ? styles.rejectedStep : ''}`}
              >
                {/* Step Connector Line */}
                {index < workflow.steps.length - 1 && <div className={styles.stepConnector} />}

                <div className={styles.stepTop}>
                  <div className={styles.stepNumberBadge}>
                    <span>{step.stepNumber}</span>
                  </div>

                  <div className={styles.stepTitleMeta}>
                    <div className={styles.stepTypeBadge}>
                      {(step.stepType || 'action').toUpperCase()}
                    </div>
                    {step.requiresApproval && (
                      <span className={styles.approvalRequiredBadge}>
                        🔒 Human Approval Required
                      </span>
                    )}
                  </div>

                  <div className={`${styles.statusBadge} ${styles[`status_${currentStatus}`]}`}>
                    {currentStatus === 'approved' && '✅ Approved'}
                    {currentStatus === 'rejected' && '❌ Rejected'}
                    {currentStatus === 'completed' && '✔️ Completed'}
                    {currentStatus === 'pending' && '⏳ Pending Approval'}
                    {currentStatus === 'executing' && '⚡ Executing'}
                  </div>
                </div>

                <div className={styles.stepContent}>
                  {isEditing ? (
                    <div className={styles.editForm}>
                      <input
                        type="text"
                        className={styles.editInput}
                        value={editInputValue}
                        onChange={(e) => setEditInputValue(e.target.value)}
                        autoFocus
                      />
                      <button
                        className={styles.saveEditBtn}
                        onClick={() => handleSaveEdit(step)}
                      >
                        Save Action
                      </button>
                      <button
                        className={styles.cancelEditBtn}
                        onClick={() => setEditingStep(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <h5 className={styles.stepAction}>{currentAction}</h5>
                  )}

                  <p className={styles.stepDescription}>{step.description}</p>

                  <div className={styles.stepFooterMeta}>
                    <span className={styles.assignee}>👤 Assignee: {step.assignee || 'FlowPilot AI'}</span>
                  </div>
                </div>

                {/* FEATURE 3: Human Approval Controls for Consequential Actions */}
                {isConsequential && currentStatus === 'pending' && (
                  <div className={styles.approvalBox}>
                    <div className={styles.proposedActionHeader}>
                      <span className={styles.proposedIcon}>🛡️</span>
                      <span className={styles.proposedLabel}>AI PROPOSED ACTION</span>
                    </div>
                    <div className={styles.proposedActionText}>{currentAction}</div>

                    <div className={styles.approvalButtons}>
                      <button
                        className={styles.approveBtn}
                        onClick={() => handleApprove(step)}
                        disabled={isLoading}
                      >
                        {isLoading ? '...' : 'Approve'}
                      </button>
                      <button
                        className={styles.editBtn}
                        onClick={() => handleStartEdit(step)}
                        disabled={isLoading}
                      >
                        Edit
                      </button>
                      <button
                        className={styles.rejectBtn}
                        onClick={() => handleReject(step)}
                        disabled={isLoading}
                      >
                        {isLoading ? '...' : 'Reject'}
                      </button>
                    </div>
                  </div>
                )}

                {currentStatus === 'approved' && (
                  <div className={styles.approvedBanner}>
                    ✅ Action Approved — Workflow step queued for safe execution.
                  </div>
                )}

                {currentStatus === 'rejected' && (
                  <div className={styles.rejectedBanner}>
                    ❌ Action Rejected — Workflow step halted by human operator.
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
