'use client';

import { useState, useEffect } from 'react';
import type { PipelineResponse, DashboardMetrics, ApprovalItem } from '@/lib/types';
import { Navbar, NavTab } from '@/components/Navbar';
import { CycleBanner } from '@/components/CycleBanner';
import { AIUnderstandingCard } from '@/components/AIUnderstandingCard';
import { MemoryCard } from '@/components/MemoryCard';
import { WorkflowProposalCard } from '@/components/WorkflowProposalCard';
import { ActivityTimeline } from '@/components/ActivityTimeline';
import { DashboardSummary } from '@/components/DashboardSummary';
import { MemoryCenter } from '@/components/MemoryCenter';
import { WorkflowsCenter } from '@/components/WorkflowsCenter';
import { ApprovalCenter } from '@/components/ApprovalCenter';
import { ActivityPage } from '@/components/ActivityPage';
import { AnalyticsPage } from '@/components/AnalyticsPage';
import styles from './page.module.css';

const DEFAULT_DEMO_INPUT =
  "ABC Enterprises hasn't confirmed their quotation.\nThey normally prefer PDF quotations.\nFollow up tomorrow and escalate if they don't respond.";

export default function Home() {
  const [activeTab, setActiveTab] = useState<NavTab>('inbox');
  const [message, setMessage] = useState(DEFAULT_DEMO_INPUT);
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState<string>('');
  const [result, setResult] = useState<PipelineResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Dashboard & Navigation Shared States
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [pendingApprovals, setPendingApprovals] = useState<ApprovalItem[]>([]);

  const fetchDashboardData = async () => {
    try {
      const res = await fetch('/api/dashboard');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setMetrics(data.metrics);
          setPendingApprovals(data.pendingApprovals || []);
        }
      }
    } catch (e) {
      console.warn('Could not fetch dashboard data:', e);
    }
  };

  useEffect(() => {
    let isMounted = true;
    fetch('/api/dashboard')
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data.success) {
          setMetrics(data.metrics);
          setPendingApprovals(data.pendingApprovals || []);
        }
      })
      .catch((e) => console.warn('Could not fetch dashboard data:', e));
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || loading) return;

    setLoading(true);
    setError(null);
    setResult(null);

    setLoadingStep('1/3 Extracting Intent & Entities with Gemini...');
    const t1 = setTimeout(() => {
      setLoadingStep('2/3 Searching Customer Context in Breeth Memory...');
    }, 1800);
    const t2 = setTimeout(() => {
      setLoadingStep('3/3 Synthesizing Reasoning & Workflow Proposal with Gemini...');
    }, 3800);

    try {
      const res = await fetch('/api/pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: message.trim() }),
      });

      const data: PipelineResponse = await res.json();
      setResult(data);

      if (!data.success) {
        setError(data.error ?? 'Pipeline returned an error.');
      } else {
        fetchDashboardData();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Network error';
      setError(msg);
    } finally {
      clearTimeout(t1);
      clearTimeout(t2);
      setLoading(false);
      setLoadingStep('');
    }
  };

  const handleApprovalDecision = async (
    approvalId: string,
    action: 'approved' | 'rejected',
  ) => {
    try {
      const res = await fetch('/api/approval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approvalId, action }),
      });

      if (res.ok) {
        fetchDashboardData();
      }
    } catch (e) {
      console.warn('Error recording approval:', e);
    }
  };

  return (
    <div className={styles.page}>
      {/* Background Glow Orbs */}
      <div className={styles.bgOrb1} />
      <div className={styles.bgOrb2} />
      <div className={styles.bgOrb3} />

      {/* Global Responsive Navigation Bar */}
      <Navbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        pendingApprovalsCount={pendingApprovals.length}
      />

      <main className={styles.main}>
        {/* Core Product Lifecycle Concept Banner / Command Center */}
        <div className={styles.bannerWrapper}>
          <CycleBanner
            loading={loading}
            result={result}
            activeStage={
              loading
                ? 'reason'
                : result?.workflow
                ? 'plan'
                : activeTab === 'memory'
                ? 'remember'
                : 'understand'
            }
          />
        </div>

        {/* 1. DASHBOARD TAB */}
        {activeTab === 'dashboard' && (
          <DashboardSummary
            metrics={metrics}
            pendingApprovalsList={pendingApprovals}
            onApproveAction={(id) => handleApprovalDecision(id, 'approved')}
            onRejectAction={(id) => handleApprovalDecision(id, 'rejected')}
            onRefresh={fetchDashboardData}
          />
        )}

        {/* 2. AI INBOX TAB */}
        {activeTab === 'inbox' && (
          <div className={styles.inboxTab}>
            <section className={styles.inputSection}>
              <div className={styles.sectionHeader}>
                <span className={styles.sectionIcon}>📥</span>
                <div>
                  <h2 className={styles.sectionTitle}>AI Inbox — Workflow Generation</h2>
                  <p className={styles.sectionSubtitle}>
                    Paste unstructured work messages to trigger memory retrieval and Gemini workflow generation.
                  </p>
                </div>

                <button
                  type="button"
                  className={styles.demoBtn}
                  onClick={() => setMessage(DEFAULT_DEMO_INPUT)}
                  disabled={loading}
                >
                  Load Demo Input
                </button>
              </div>

              <form onSubmit={handleSubmit} className={styles.form}>
                <textarea
                  id="user-message"
                  className={styles.textarea}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  placeholder="Enter unstructured work message..."
                  disabled={loading}
                />

                <div className={styles.formFooter}>
                  <span className={styles.hint}>
                    🔒 Gemini + Breeth run securely on server.
                  </span>

                  <button
                    id="submit-pipeline"
                    type="submit"
                    className={styles.submitBtn}
                    disabled={loading || !message.trim()}
                  >
                    {loading ? <span className={styles.spinner} /> : null}
                    {loading ? 'Running AI Engine…' : 'Generate Workflow'}
                  </button>
                </div>
              </form>

              {loading && (
                <div className={styles.processingState}>
                  <div className={styles.processingPulse} />
                  <span>{loadingStep}</span>
                </div>
              )}
            </section>

            {error && (
              <div className={styles.errorCard}>
                <strong>Error:</strong> {error}
              </div>
            )}

            {result && (
              <div className={styles.resultsGrid}>
                {result.extraction && <AIUnderstandingCard extraction={result.extraction} />}

                <MemoryCard memoryResult={result.memorySearch} />

                {result.workflow && (
                  <WorkflowProposalCard
                    workflow={result.workflow}
                    onApprovalDecision={handleApprovalDecision}
                  />
                )}

                {result.activityLog && result.activityLog.length > 0 && (
                  <ActivityTimeline events={result.activityLog} />
                )}
              </div>
            )}
          </div>
        )}

        {/* 3. WORKFLOWS TAB */}
        {activeTab === 'workflows' && (
          <WorkflowsCenter onOpenApproval={() => setActiveTab('approvals')} />
        )}

        {/* 4. MEMORY TAB */}
        {activeTab === 'memory' && <MemoryCenter />}

        {/* 5. APPROVALS TAB */}
        {activeTab === 'approvals' && <ApprovalCenter />}

        {/* 6. ACTIVITY TAB */}
        {activeTab === 'activity' && <ActivityPage />}

        {/* 7. ANALYTICS TAB */}
        {activeTab === 'analytics' && <AnalyticsPage />}
      </main>
    </div>
  );
}
