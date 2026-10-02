'use client';

import React from 'react';
import type { ActivityEvent } from '@/lib/types';
import styles from './ActivityTimeline.module.css';

interface ActivityTimelineProps {
  events: ActivityEvent[];
}

const EVENT_ICONS: Record<string, string> = {
  message_received: '📥',
  intent_identified: '🧠',
  memory_searched: '🔍',
  memory_retrieved: '💾',
  workflow_generated: '⚡',
  approval_requested: '🛡️',
  action_approved: '✅',
  action_rejected: '❌',
  action_edited: '✏️',
  error: '⚠️',
};

const EVENT_LABELS: Record<string, string> = {
  message_received: 'Message Received',
  intent_identified: 'Intent Identified',
  memory_searched: 'Memory Searched',
  memory_retrieved: 'Memory Retrieved',
  workflow_generated: 'Workflow Generated',
  approval_requested: 'Approval Requested',
  action_approved: 'Action Approved',
  action_rejected: 'Action Rejected',
  action_edited: 'Action Edited',
  error: 'System Error',
};

export const ActivityTimeline: React.FC<ActivityTimelineProps> = ({ events }) => {
  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <span className={styles.icon}>📋</span>
        <div>
          <h3 className={styles.title}>FEATURE 4 — Activity Timeline</h3>
          <p className={styles.subtitle}>Real-time execution log from Supabase activity_logs</p>
        </div>
      </div>

      <div className={styles.timelineContainer}>
        {events.map((event, idx) => {
          const icon = EVENT_ICONS[event.type] || '📌';
          const label = EVENT_LABELS[event.type] || event.type.replace(/_/g, ' ');
          const isError = event.type === 'error';
          const isApproved = event.type === 'action_approved';
          const isRejected = event.type === 'action_rejected';

          return (
            <div
              key={event.id || idx}
              className={`${styles.item} ${isError ? styles.itemError : ''} ${
                isApproved ? styles.itemApproved : ''
              } ${isRejected ? styles.itemRejected : ''}`}
            >
              <div className={styles.nodeIcon}>{icon}</div>

              <div className={styles.content}>
                <div className={styles.topMeta}>
                  <span className={styles.badge}>{label}</span>
                  <span className={styles.time}>
                    {new Date(event.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <p className={styles.detail}>{event.detail}</p>
              </div>

              {idx < events.length - 1 && <div className={styles.line} />}
            </div>
          );
        })}
      </div>
    </div>
  );
};
