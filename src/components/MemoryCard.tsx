'use client';

import React from 'react';
import type { BreethSearchResult } from '@/lib/types';
import styles from './MemoryCard.module.css';

interface MemoryCardProps {
  memoryResult: BreethSearchResult | null;
}

export const MemoryCard: React.FC<MemoryCardProps> = ({ memoryResult }) => {
  const memories = memoryResult?.memories || [];
  const hasMemories = memories.length > 0;

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <div className={styles.headerTitle}>
          <span className={styles.icon}>💾</span>
          <div>
            <span className={styles.memoryLabel}>Retrieved from FlowPilot Memory</span>
            <h3 className={styles.heading}>Breeth Memory Store</h3>
          </div>
        </div>
        <span className={styles.resultCount}>
          {hasMemories ? `${memories.length} Fact(s) Found` : '0 Facts Found'}
        </span>
      </div>

      {memoryResult?.query && (
        <div className={styles.searchQueryBadge}>
          <span className={styles.queryLabel}>Search Query:</span>
          <code className={styles.queryCode}>&ldquo;{memoryResult.query}&rdquo;</code>
        </div>
      )}

      {hasMemories ? (
        <div className={styles.memoryList}>
          {memories.map((mem, idx) => (
            <div key={mem.id || idx} className={styles.memoryItem}>
              <div className={styles.memoryItemTop}>
                <span className={styles.scoreBadge}>
                  {(mem.score * 100).toFixed(0)}% MATCH
                </span>
                <span className={styles.influenceTag}>
                  ⚡ Influenced Workflow: Injected customer context
                </span>
              </div>
              <p className={styles.memoryText}>{mem.content}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.emptyMemory}>
          <div className={styles.emptyIcon}>🔍</div>
          <p className={styles.emptyText}>
            No matching customer facts found in Breeth for this query context.
          </p>
          <span className={styles.emptyNote}>
            FlowPilot generated this workflow using real-time message extraction.
          </span>
        </div>
      )}
    </div>
  );
};
