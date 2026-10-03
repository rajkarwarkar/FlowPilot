'use client';

import React, { useState, useEffect } from 'react';
import type { BreethSearchResult } from '@/lib/types';
import styles from './MemoryCenter.module.css';

export const MemoryCenter: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('ABC Enterprises PDF quotation');
  const [loading, setLoading] = useState(false);
  const [searchResult, setSearchResult] = useState<BreethSearchResult | null>(null);

  const performSearch = async (queryStr: string) => {
    if (!queryStr.trim()) return;
    setLoading(true);

    try {
      const res = await fetch(`/api/memory/search?q=${encodeURIComponent(queryStr.trim())}`);
      const data = await res.json();
      if (data.success && data.result) {
        setSearchResult(data.result);
      }
    } catch (e) {
      console.warn('Memory search error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    fetch(`/api/memory/search?q=${encodeURIComponent('ABC Enterprises PDF quotation')}`)
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data.success && data.result) {
          setSearchResult(data.result);
        }
      })
      .catch((e) => console.warn('Memory search error:', e));
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(searchQuery);
  };

  return (
    <div className={styles.container}>
      {/* Explanation Banner */}
      <div className={styles.explanationBanner}>
        <div className={styles.bannerIcon}>🧠</div>
        <div>
          <span className={styles.bannerLabel}>PERSISTENT BUSINESS CONTEXT</span>
          <h2 className={styles.bannerTitle}>FlowPilot Memory Center</h2>
          <p className={styles.bannerText}>
            FlowPilot uses persistent memory to retain useful context across work interactions.
            Search historical facts, customer preferences, and interaction outcomes stored in Breeth.
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className={styles.searchSection}>
        <form onSubmit={handleSearchSubmit} className={styles.searchForm}>
          <div className={styles.inputWrapper}>
            <span className={styles.searchIcon}>🔍</span>
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Search FlowPilot Memory..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button type="submit" className={styles.searchBtn} disabled={loading}>
            {loading ? 'Searching Breeth…' : 'Search Memory'}
          </button>
        </form>
      </div>

      {/* Memory Used Context Highlight */}
      <div className={styles.contextHighlight}>
        <div className={styles.highlightHeader}>
          <span className={styles.highlightBadge}>ACTIVE MEMORY USED IN WORKFLOW</span>
        </div>
        <div className={styles.highlightCard}>
          <div className={styles.highlightEntity}>
            🏢 {(searchResult?.memories[0]?.metadata?.company as string) || 'ABC Enterprises'}
          </div>
          <div className={styles.highlightFact}>
            <strong>Fact / Preference:</strong>{' '}
            {searchResult?.memories[0]?.content || 'Prefers PDF quotations via email'}
          </div>
          <div className={styles.highlightMeta}>
            <span>Source: <strong>FlowPilot Memory (Breeth API)</strong></span>
            <span>Retrieved: <strong>Real-time API</strong></span>
          </div>
        </div>
      </div>

      {/* Memory Results */}
      <div className={styles.resultsSection}>
        <h3 className={styles.resultsHeader}>
          <span>💾 Search Results ({searchResult?.memories.length || 0} Records)</span>
        </h3>

        {loading && (
          <div className={styles.loadingBox}>
            <div className={styles.spinner} />
            <span>Querying Breeth Memory REST API...</span>
          </div>
        )}

        {!loading && searchResult && searchResult.memories.length > 0 && (
          <div className={styles.memoryGrid}>
            {searchResult.memories.map((mem, idx) => (
              <div key={mem.id || idx} className={styles.memoryCard}>
                <div className={styles.cardTop}>
                  <span className={styles.scoreBadge}>
                    {(mem.score * 100).toFixed(0)}% Relevance
                  </span>
                  <span className={styles.sourceTag}>Retrieved from FlowPilot Memory</span>
                </div>
                <p className={styles.cardContent}>{mem.content}</p>
                <div className={styles.cardFooter}>
                  <span>ID: {mem.id}</span>
                  <span>Source: Breeth API</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && searchResult && searchResult.memories.length === 0 && (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>🔍</div>
            <h4>No memories found for &ldquo;{searchResult.query}&rdquo;</h4>
            <p>
              FlowPilot Memory queries the live Breeth REST API. As new work messages are processed,
              episodes and customer facts are automatically recorded into long-term memory.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
