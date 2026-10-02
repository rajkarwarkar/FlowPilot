'use client';

import React, { useState, useEffect } from 'react';
import type { ApprovalItem } from '@/lib/types';
import styles from './ApprovalCenter.module.css';

export const ApprovalCenter: React.FC = () => {
  const [approvals, setApprovals] = useState<ApprovalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editActionValue, setEditActionValue] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchApprovals = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/approvals');
      const data = await res.json();
      if (data.success && data.approvals) {
        setApprovals(data.approvals);
      }
    } catch (e) {
      console.warn('Failed to fetch approvals:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    fetch('/api/approvals')
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data.success && data.approvals) {
          setApprovals(data.approvals);
        }
      })
      .catch((e) => console.warn('Failed to fetch approvals:', e))
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleDecision = async (approvalId: string, action: 'approved' | 'rejected') => {
    setActionLoadingId(approvalId);
    try {
      const res = await fetch('/api/approval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approvalId, action }),
      });

      if (res.ok) {
        showNotification(`Action ${action} successfully. Database & step status updated!`, 'success');
        fetchApprovals();
      } else {
        showNotification('Failed to record approval decision.', 'error');
      }
    } catch {
      showNotification('Network error processing approval.', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleStartEdit = (item: ApprovalItem) => {
    setEditingId(item.id);
    setEditActionValue(item.proposedAction);
  };

  const handleSaveEdit = async (item: ApprovalItem) => {
    if (!editActionValue.trim()) return;
    setActionLoadingId(item.id);
    try {
      const res = await fetch('/api/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approvalId: item.id, newAction: editActionValue.trim() }),
      });

      if (res.ok) {
        showNotification('Proposed action modified successfully!', 'success');
        setEditingId(null);
        fetchApprovals();
      } else {
        showNotification('Failed to update proposed action.', 'error');
      }
    } catch {
      showNotification('Network error saving edit.', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const pendingList = approvals.filter((a) => a.status === 'pending');
  const decidedList = approvals.filter((a) => a.status !== 'pending');

  return (
    <div className={styles.container}>
      {toast && (
        <div className={`${styles.toast} ${styles[`toast_${toast.type}`]}`}>
          {toast.type === 'success' ? '✅' : '❌'} {toast.message}
        </div>
      )}

      <div className={styles.header}>
        <div>
          <span className={styles.headerBadge}>HUMAN-IN-THE-LOOP GUARDRAIL</span>
          <h2 className={styles.title}>Approval Control Center</h2>
          <p className={styles.subtitle}>
            Review and sign-off on consequential AI action proposals before execution.
          </p>
        </div>
        <button className={styles.refreshBtn} onClick={fetchApprovals}>
          🔄 Refresh Approvals
        </button>
      </div>

      {loading ? (
        <div className={styles.loadingBox}>
          <div className={styles.spinner} />
          <span>Loading real Supabase approval queue...</span>
        </div>
      ) : (
        <div className={styles.contentSections}>
          {/* Pending Approvals */}
          <section className={styles.section}>
            <h3 className={styles.sectionHeader}>
              <span>🛡️ Pending Approvals Queue ({pendingList.length})</span>
            </h3>

            {pendingList.length === 0 ? (
              <div className={styles.emptyCard}>
                <div className={styles.emptyIcon}>✅</div>
                <h4>All Clear! No Pending Approvals</h4>
                <p>All consequential actions have been signed off or processed.</p>
              </div>
            ) : (
              <div className={styles.approvalsGrid}>
                {pendingList.map((item) => {
                  const isEditing = editingId === item.id;
                  const isProcessing = actionLoadingId === item.id;

                  return (
                    <div key={item.id} className={styles.approvalCard}>
                      <div className={styles.cardTop}>
                        <span className={styles.wfTag}>{item.workflowTitle}</span>
                        <span className={styles.timeTag}>
                          {new Date(item.createdAt).toLocaleTimeString()}
                        </span>
                      </div>

                      <div className={styles.cardContent}>
                        <div className={styles.stepNumTag}>Step {item.stepNumber}</div>

                        {isEditing ? (
                          <div className={styles.editForm}>
                            <input
                              type="text"
                              className={styles.editInput}
                              value={editActionValue}
                              onChange={(e) => setEditActionValue(e.target.value)}
                              autoFocus
                            />
                            <div className={styles.editBtnGroup}>
                              <button
                                className={styles.saveBtn}
                                onClick={() => handleSaveEdit(item)}
                              >
                                Save Action
                              </button>
                              <button
                                className={styles.cancelBtn}
                                onClick={() => setEditingId(null)}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <h4 className={styles.actionTitle}>{item.proposedAction}</h4>
                        )}

                        {item.description && <p className={styles.actionDesc}>{item.description}</p>}
                      </div>

                      <div className={styles.cardActions}>
                        <button
                          className={styles.approveBtn}
                          onClick={() => handleDecision(item.id, 'approved')}
                          disabled={isProcessing}
                        >
                          {isProcessing ? '...' : 'Approve'}
                        </button>

                        <button
                          className={styles.editActionBtn}
                          onClick={() => handleStartEdit(item)}
                          disabled={isProcessing}
                        >
                          Edit Action
                        </button>

                        <button
                          className={styles.rejectBtn}
                          onClick={() => handleDecision(item.id, 'rejected')}
                          disabled={isProcessing}
                        >
                          {isProcessing ? '...' : 'Reject'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Past Decisions History */}
          {decidedList.length > 0 && (
            <section className={styles.section}>
              <h3 className={styles.sectionHeader}>
                <span>📋 Approval History ({decidedList.length})</span>
              </h3>

              <div className={styles.historyList}>
                {decidedList.map((item) => (
                  <div key={item.id} className={styles.historyRow}>
                    <span className={`${styles.decisionBadge} ${styles[`status_${item.status}`]}`}>
                      {item.status === 'approved' ? '✅ APPROVED' : '❌ REJECTED'}
                    </span>

                    <div className={styles.historyBody}>
                      <div className={styles.historyTitle}>
                        {item.workflowTitle} — Step {item.stepNumber}: {item.proposedAction}
                      </div>
                      <div className={styles.historyTime}>
                        Decided at {new Date(item.decidedAt || item.createdAt).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
};
