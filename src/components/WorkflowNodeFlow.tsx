'use client';

import React from 'react';
import styles from './WorkflowNodeFlow.module.css';

interface WorkflowNodeFlowProps {
  currentStepIndex?: number;
  completedStepsCount?: number;
}

const ENGINE_NODES = [
  { id: 'input', label: 'INPUT', icon: '📥', desc: 'Work Message Received' },
  { id: 'understand', label: 'UNDERSTAND', icon: '🧠', desc: 'Intent & Entity Extraction' },
  { id: 'remember', label: 'REMEMBER', icon: '💾', desc: 'Breeth Context Search' },
  { id: 'reason', label: 'REASON', icon: '⚡', desc: 'Gemini Strategy Synthesis' },
  { id: 'plan', label: 'PLAN', icon: '📋', desc: 'Workflow Step Construction' },
  { id: 'approval', label: 'APPROVAL', icon: '🛡️', desc: 'Human Sign-off Guardrail' },
  { id: 'act', label: 'ACT', icon: '🚀', desc: 'Safe Action Execution' },
  { id: 'verify', label: 'VERIFY', icon: '🔍', desc: 'Condition & Outcome Audit' },
  { id: 'remember2', label: 'REMEMBER', icon: '🧠', desc: 'Breeth Memory Episode Update' },
];

export const WorkflowNodeFlow: React.FC<WorkflowNodeFlowProps> = ({
  currentStepIndex = 4,
  completedStepsCount = 2,
}) => {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.titleBadge}>WORKFLOW ENGINE LIFECYCLE</span>
        <h3 className={styles.title}>Connected Node Execution Visualizer</h3>
      </div>

      <div className={styles.nodesTrack}>
        {ENGINE_NODES.map((node, index) => {
          const isCompleted = index < completedStepsCount;
          const isActive = index === currentStepIndex;

          return (
            <React.Fragment key={node.id + index}>
              <div
                className={`${styles.nodeCard} ${isCompleted ? styles.completedNode : ''} ${
                  isActive ? styles.activeNode : ''
                }`}
              >
                <div className={styles.nodeHeader}>
                  <span className={styles.icon}>{node.icon}</span>
                  <span className={styles.nodeLabel}>{node.label}</span>
                </div>
                <div className={styles.nodeDesc}>{node.desc}</div>
                <div className={styles.stateIndicator}>
                  {isCompleted && '✓ Completed'}
                  {isActive && '● Active Step'}
                  {!isCompleted && !isActive && '○ Queued'}
                </div>
              </div>

              {index < ENGINE_NODES.length - 1 && (
                <div
                  className={`${styles.connector} ${
                    index < completedStepsCount ? styles.activeConnector : ''
                  }`}
                >
                  <span className={styles.arrow}>→</span>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
