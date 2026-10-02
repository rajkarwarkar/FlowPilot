'use client';

import React from 'react';
import styles from './CycleBanner.module.css';

interface CycleBannerProps {
  activeStage?: 'remember' | 'reason' | 'plan' | 'act' | 'verify' | 'remember2';
}

const STAGES = [
  { id: 'remember', label: 'REMEMBER', icon: '🧠', desc: 'Breeth Context Search' },
  { id: 'reason', label: 'REASON', icon: '⚡', desc: 'Gemini Intent Extraction' },
  { id: 'plan', label: 'PLAN', icon: '📋', desc: 'Workflow Step Synthesis' },
  { id: 'act', label: 'ACT', icon: '🛡️', desc: 'Human Approval & Execution' },
  { id: 'verify', label: 'VERIFY', icon: '✅', desc: 'Feedback & Condition Check' },
  { id: 'remember2', label: 'REMEMBER', icon: '💾', desc: 'Memory Episode Update' },
];

export const CycleBanner: React.FC<CycleBannerProps> = ({ activeStage }) => {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.badge}>FLOWPILOT ENGINE ARCHITECTURE</span>
        <h2 className={styles.title}>Autonomous AI Lifecycle</h2>
      </div>
      <div className={styles.cycleGrid}>
        {STAGES.map((stage, idx) => {
          const isActive = activeStage === stage.id;
          return (
            <React.Fragment key={idx}>
              <div className={`${styles.node} ${isActive ? styles.activeNode : ''}`}>
                <div className={styles.nodeIcon}>{stage.icon}</div>
                <div className={styles.nodeLabel}>{stage.label}</div>
                <div className={styles.nodeDesc}>{stage.desc}</div>
              </div>
              {idx < STAGES.length - 1 && (
                <div className={styles.arrow}>
                  <span>→</span>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
