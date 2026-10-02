'use client';

import React, { useState, useEffect } from 'react';
import type { ActivityEvent } from '@/lib/types';
import styles from './ActivityPage.module.css';

const ACTOR_MAP: Record<string, { name: string; badgeClass: string; icon: string }> = {
  message_received: { name: 'User Input', badgeClass: 'actorUser', icon: '👤' },
  intent_identified: { name: 'Gemini AI', badgeClass: 'actorAI', icon: '🧠' },
  memory_searched: { name: 'Breeth Engine', badgeClass: 'actorMemory', icon: '🔍' },
  memory_retrieved: { name: 'Breeth Engine', badgeClass: 'actorMemory', icon: '💾' },
  workflow_generated: { name: 'Gemini AI', badgeClass: 'actorAI', icon: '⚡' },
  approval_requested: { name: 'FlowPilot System', badgeClass: 'actorSystem', icon: '🛡️' },
  action_approved: { name: 'Human Operator', badgeClass: 'actorHuman', icon: '✅' },
  action_rejected: { name: 'Human Operator', badgeClass: 'actorHuman', icon: '❌' },
  action_edited: { name: 'Human Operator', badgeClass: 'actorHuman', icon: '✏️' },
  error: { name: 'System Error', badgeClass: 'actorError', icon: '⚠️' },
};

export const ActivityPage: React.FC = () => {
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchActivity = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/activity');
      const data = await res.json();
      if (data.success && data.activity) {
        setActivities(data.activity);
      }
    } catch (e) {
      console.warn('Failed to fetch activity logs:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    fetch('/api/activity')
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data.success && data.activity) {
          setActivities(data.activity);
        }
      })
      .catch((e) => console.warn('Failed to fetch activity logs:', e))
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
          <span className={styles.headerBadge}>REAL SUPABASE ACTIVITY LOGS</span>
          <h2 className={styles.title}>Global Activity Timeline</h2>
          <p className={styles.subtitle}>
            Audit trail of all autonomous AI operations, memory lookups, and human operator sign-offs.
          </p>
        </div>
        <button className={styles.refreshBtn} onClick={fetchActivity}>
          🔄 Refresh Log
        </button>
      </div>

      {loading ? (
        <div className={styles.loadingBox}>
          <div className={styles.spinner} />
          <span>Fetching activity logs from database...</span>
        </div>
      ) : activities.length === 0 ? (
        <div className={styles.emptyCard}>
          <div className={styles.emptyIcon}>📋</div>
          <h4>No Activity Recorded Yet</h4>
          <p>Activity events will be logged automatically as you process messages in AI Inbox.</p>
        </div>
      ) : (
        <div className={styles.timelineList}>
          {activities.map((item, idx) => {
            const actorMeta = ACTOR_MAP[item.type] || {
              name: 'FlowPilot System',
              badgeClass: 'actorSystem',
              icon: '📌',
            };

            return (
              <div key={item.id || idx} className={styles.timelineRow}>
                <div className={styles.actorNode}>
                  <span className={styles.actorIcon}>{actorMeta.icon}</span>
                </div>

                <div className={styles.timelineCard}>
                  <div className={styles.cardHeader}>
                    <span className={`${styles.actorBadge} ${styles[actorMeta.badgeClass]}`}>
                      {actorMeta.name}
                    </span>
                    <span className={styles.typeBadge}>{item.type.replace(/_/g, ' ').toUpperCase()}</span>
                    <span className={styles.timestamp}>
                      {new Date(item.timestamp).toLocaleString()}
                    </span>
                  </div>

                  <p className={styles.detailText}>{item.detail}</p>

                  {item.workflowId && (
                    <div className={styles.workflowRef}>
                      <span>Workflow Ref: <code>{item.workflowId}</code></span>
                    </div>
                  )}
                </div>

                {idx < activities.length - 1 && <div className={styles.lineConnector} />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
