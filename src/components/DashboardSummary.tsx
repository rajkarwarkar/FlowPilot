'use client';

import React from 'react';
import type { DashboardMetrics, ApprovalItem } from '@/lib/types';
import styles from './DashboardSummary.module.css';

interface DashboardSummaryProps {
  metrics: DashboardMetrics | null;
  pendingApprovalsList: ApprovalItem[];
  onApproveAction?: (approvalId: string) => Promise<void>;
  onRejectAction?: (approvalId: string) => Promise<void>;
  onRefresh?: () => void;
}

export const DashboardSummary: React.FC<DashboardSummaryProps> = ({
  metrics,
  pendingApprovalsList,
  onApproveAction,
  onRejectAction,
  onRefresh,
}) => {
  if (!metrics) {
    return (
      <div className={styles.loadingCard}>
        <div className={styles.spinner} />
        <span>Loading live Supabase dashboard summary metrics...</span>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <div className={styles.liveBadge}>LIVE SUPABASE DATA</div>
          <h2 className={styles.title}>FlowPilot Control Center Dashboard</h2>
        </div>
        {onRefresh && (
          <button className={styles.refreshBtn} onClick={onRefresh}>
            🔄 Refresh Metrics
          </button>
        )}
      </div>

      {/* Metrics Grid */}
      <div className={styles.metricsGrid}>
        <div className={`${styles.metricCard} ${styles.activeCard}`}>
          <div className={styles.metricTop}>
            <span className={styles.metricIcon}>⚡</span>
            <span className={styles.metricLabel}>Active Workflows</span>
          </div>
          <div className={styles.metricValue}>{metrics.activeWorkflows}</div>
          <div className={styles.metricSub}>Live in execution engine</div>
        </div>

        <div className={`${styles.metricCard} ${styles.pendingCard}`}>
          <div className={styles.metricTop}>
            <span className={styles.metricIcon}>🛡️</span>
            <span className={styles.metricLabel}>Pending Approvals</span>
          </div>
          <div className={styles.metricValue}>{metrics.pendingApprovals}</div>
          <div className={styles.metricSub}>Consequential actions awaiting sign-off</div>
        </div>

        <div className={`${styles.metricCard} ${styles.actionsCard}`}>
          <div className={styles.metricTop}>
            <span className={styles.metricIcon}>🧠</span>
            <span className={styles.metricLabel}>AI Actions</span>
          </div>
          <div className={styles.metricValue}>{metrics.aiActions}</div>
          <div className={styles.metricSub}>Total operations processed</div>
        </div>

        <div className={`${styles.metricCard} ${styles.priorityCard}`}>
          <div className={styles.metricTop}>
            <span className={styles.metricIcon}>🔥</span>
            <span className={styles.metricLabel}>High Priority Items</span>
          </div>
          <div className={styles.metricValue}>{metrics.highPriorityItems}</div>
          <div className={styles.metricSub}>High & Critical intensity items</div>
        </div>

        <div className={`${styles.metricCard} ${styles.completedCard}`}>
          <div className={styles.metricTop}>
            <span className={styles.metricIcon}>✅</span>
            <span className={styles.metricLabel}>Completed Workflows</span>
          </div>
          <div className={styles.metricValue}>{metrics.completedWorkflows}</div>
          <div className={styles.metricSub}>Successfully executed</div>
        </div>
      </div>

      {/* Pending Approvals Queue */}
      {pendingApprovalsList.length > 0 && (
        <div className={styles.approvalsSection}>
          <h3 className={styles.sectionTitle}>
            🛡️ Pending Approval Queue ({pendingApprovalsList.length})
          </h3>
          <div className={styles.approvalsList}>
            {pendingApprovalsList.map((item) => (
              <div key={item.id} className={styles.approvalItemCard}>
                <div className={styles.approvalInfo}>
                  <div className={styles.wfTitle}>{item.workflowTitle}</div>
                  <div className={styles.proposedAction}>
                    Step {item.stepNumber}: {item.proposedAction}
                  </div>
                  {item.description && <p className={styles.appDesc}>{item.description}</p>}
                </div>
                <div className={styles.approvalBtnGroup}>
                  {onApproveAction && (
                    <button
                      className={styles.approveBtn}
                      onClick={() => onApproveAction(item.id)}
                    >
                      Approve
                    </button>
                  )}
                  {onRejectAction && (
                    <button
                      className={styles.rejectBtn}
                      onClick={() => onRejectAction(item.id)}
                    >
                      Reject
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
