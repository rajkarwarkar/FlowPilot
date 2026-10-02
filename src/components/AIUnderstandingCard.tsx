'use client';

import React from 'react';
import type { ExtractedIntent } from '@/lib/types';
import styles from './AIUnderstandingCard.module.css';

interface AIUnderstandingCardProps {
  extraction: ExtractedIntent;
}

export const AIUnderstandingCard: React.FC<AIUnderstandingCardProps> = ({ extraction }) => {
  const priorityClass = styles[`priority_${extraction.priority}`] || styles.priority_medium;

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <div className={styles.headerTitle}>
          <span className={styles.icon}>🧠</span>
          <h3>AI UNDERSTANDING</h3>
        </div>
        <span className={`${styles.priorityBadge} ${priorityClass}`}>
          {extraction.priority.toUpperCase()} PRIORITY
        </span>
      </div>

      <div className={styles.grid}>
        {/* Intent */}
        <div className={styles.fieldGroup}>
          <span className={styles.label}>Intent</span>
          <span className={styles.valueHighlight}>{extraction.intent}</span>
        </div>

        {/* Contact / Company */}
        <div className={styles.fieldGroup}>
          <span className={styles.label}>Contact</span>
          <span className={styles.value}>{extraction.contact || extraction.company || 'Not Specified'}</span>
        </div>

        {/* Priority */}
        <div className={styles.fieldGroup}>
          <span className={styles.label}>Priority</span>
          <span className={styles.valueCap}>{extraction.priority} (AI Reasoning)</span>
        </div>

        {/* Deadline */}
        <div className={styles.fieldGroup}>
          <span className={styles.label}>Deadline</span>
          <span className={styles.value}>{extraction.deadline}</span>
        </div>

        {/* Requested Action */}
        <div className={styles.fieldGroupFull}>
          <span className={styles.label}>Requested Action</span>
          <span className={styles.valueAction}>{extraction.requestedAction}</span>
        </div>

        {/* Condition */}
        <div className={styles.fieldGroupFull}>
          <span className={styles.label}>Condition</span>
          <div className={styles.conditionList}>
            {extraction.conditions && extraction.conditions.length > 0 ? (
              extraction.conditions.map((cond, i) => (
                <span key={i} className={styles.conditionTag}>
                  ⚠️ {cond}
                </span>
              ))
            ) : (
              <span className={styles.value}>Escalate if no response</span>
            )}
          </div>
        </div>

        {/* Summary */}
        {extraction.summary && (
          <div className={styles.fieldGroupFull}>
            <span className={styles.label}>Summary</span>
            <p className={styles.summaryText}>{extraction.summary}</p>
          </div>
        )}

        {/* Extracted Entities */}
        {extraction.entities && extraction.entities.length > 0 && (
          <div className={styles.fieldGroupFull}>
            <span className={styles.label}>Extracted Entities</span>
            <div className={styles.entityTags}>
              {extraction.entities.map((ent, idx) => (
                <span key={idx} className={styles.entityTag}>
                  🏢 {ent}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
