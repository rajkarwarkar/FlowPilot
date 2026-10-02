'use client';

import React, { useState, useEffect } from 'react';
import styles from './AnalyticsPage.module.css';

interface AnalyticsData {
  totalAIRuns: number;
  avgLatencyMs: number;
  approvedCount: number;
  rejectedCount: number;
  pendingCount: number;
  approvalRate: number;
  totalWorkflows: number;
}

export const AnalyticsPage: React.FC = () => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/analytics');
      const json = await res.json();
      if (json.success && json.analytics) {
        setData(json.analytics);
      }
    } catch (e) {
      console.warn('Failed to fetch analytics:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    fetch('/api/analytics')
      .then((res) => res.json())
      .then((json) => {
        if (isMounted && json.success && json.analytics) {
          setData(json.analytics);
        }
      })
      .catch((e) => console.warn('Failed to fetch analytics:', e))
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
          <span className={styles.headerBadge}>REAL PRODUCTIVITY ENGINE METRICS</span>
          <h2 className={styles.title}>FlowPilot Analytics & Performance</h2>
          <p className={styles.subtitle}>
            Real-time telemetry calculated strictly from live database runs and operator decisions.
          </p>
        </div>

        <button className={styles.refreshBtn} onClick={fetchAnalytics}>
          🔄 Refresh Analytics
        </button>
      </div>

      {loading ? (
        <div className={styles.loadingBox}>
          <div className={styles.spinner} />
          <span>Calculating telemetry from database...</span>
        </div>
      ) : !data || data.totalAIRuns === 0 ? (
        <div className={styles.emptyCard}>
          <div className={styles.emptyIcon}>📈</div>
          <h4>Insufficient Operational Data</h4>
          <p>
            Process messages in the <strong>AI Inbox</strong> to generate AI engine telemetry, latency stats,
            and human approval metrics.
          </p>
        </div>
      ) : (
        <div className={styles.analyticsContent}>
          <div className={styles.metricsGrid}>
            <div className={styles.metricCard}>
              <span className={styles.cardIcon}>⚡</span>
              <div className={styles.cardLabel}>AI Engine Avg Latency</div>
              <div className={styles.cardValue}>{data.avgLatencyMs} ms</div>
              <div className={styles.cardSub}>Gemini + Breeth response speed</div>
            </div>

            <div className={styles.metricCard}>
              <span className={styles.cardIcon}>🧠</span>
              <div className={styles.cardLabel}>Total AI Operations</div>
              <div className={styles.cardValue}>{data.totalAIRuns}</div>
              <div className={styles.cardSub}>Extraction, Memory, Reasoning runs</div>
            </div>

            <div className={styles.metricCard}>
              <span className={styles.cardIcon}>🛡️</span>
              <div className={styles.cardLabel}>Human Approval Rate</div>
              <div className={styles.cardValue}>{data.approvalRate}%</div>
              <div className={styles.cardSub}>
                {data.approvedCount} Approved vs {data.rejectedCount} Rejected
              </div>
            </div>

            <div className={styles.metricCard}>
              <span className={styles.cardIcon}>📋</span>
              <div className={styles.cardLabel}>Total Workflows Generated</div>
              <div className={styles.cardValue}>{data.totalWorkflows}</div>
              <div className={styles.cardSub}>Persisted in Supabase workflows</div>
            </div>
          </div>

          {/* Efficiency Breakdown */}
          <div className={styles.efficiencyCard}>
            <h3 className={styles.efficiencyTitle}>
              <span>🤖 Automation vs Human Sign-off Efficiency</span>
            </h3>

            <div className={styles.barGroup}>
              <div className={styles.barHeader}>
                <span>Human Operator Sign-offs ({data.approvedCount + data.rejectedCount})</span>
                <span>{data.approvalRate}% Approved</span>
              </div>
              <div className={styles.barBg}>
                <div
                  className={styles.barFillApproved}
                  style={{ width: `${data.approvalRate}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
