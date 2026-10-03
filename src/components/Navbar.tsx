'use client';

import React, { useState } from 'react';
import styles from './Navbar.module.css';

export type NavTab =
  | 'dashboard'
  | 'inbox'
  | 'workflows'
  | 'memory'
  | 'approvals'
  | 'activity'
  | 'analytics';

interface NavbarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  pendingApprovalsCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  pendingApprovalsCount = 0,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSelect = (tab: NavTab) => {
    onTabChange(tab);
    setMobileMenuOpen(false);
  };

  return (
    <header className={styles.navbar}>
      <div className={styles.navContainer}>
        {/* Brand Logo & Name */}
        <div className={styles.brand} onClick={() => handleSelect('dashboard')}>
          <div className={styles.logoMark}>FP</div>
          <div>
            <div className={styles.brandTitle}>
              FlowPilot <span className={styles.aiTag}>AI</span>
            </div>
            <div className={styles.tagline}>The Memory-Aware AI Employee</div>
          </div>
        </div>

        {/* Mobile Hamburger Toggle */}
        <button
          className={styles.hamburger}
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle Navigation"
        >
          {mobileMenuOpen ? '✕' : '☰'}
        </button>

        {/* Navigation Items */}
        <nav className={`${styles.navLinks} ${mobileMenuOpen ? styles.mobileOpen : ''}`}>
          <button
            className={`${styles.navItem} ${activeTab === 'dashboard' ? styles.active : ''}`}
            onClick={() => handleSelect('dashboard')}
          >
            📊 Dashboard
          </button>
          <button
            className={`${styles.navItem} ${activeTab === 'inbox' ? styles.active : ''}`}
            onClick={() => handleSelect('inbox')}
          >
            📥 AI Inbox
          </button>
          <button
            className={`${styles.navItem} ${activeTab === 'workflows' ? styles.active : ''}`}
            onClick={() => handleSelect('workflows')}
          >
            ⚡ Workflows
          </button>
          <button
            className={`${styles.navItem} ${activeTab === 'memory' ? styles.active : ''}`}
            onClick={() => handleSelect('memory')}
          >
            🧠 Memory
          </button>
          <button
            className={`${styles.navItem} ${activeTab === 'approvals' ? styles.active : ''}`}
            onClick={() => handleSelect('approvals')}
          >
            🛡️ Approvals
            {pendingApprovalsCount > 0 && (
              <span className={styles.pendingBadge}>{pendingApprovalsCount}</span>
            )}
          </button>
          <button
            className={`${styles.navItem} ${activeTab === 'activity' ? styles.active : ''}`}
            onClick={() => handleSelect('activity')}
          >
            📋 Activity
          </button>
          <button
            className={`${styles.navItem} ${activeTab === 'analytics' ? styles.active : ''}`}
            onClick={() => handleSelect('analytics')}
          >
            📈 Analytics
          </button>
        </nav>

        {/* System Status Indicators & User Workspace Status */}
        <div className={styles.rightHeaderArea}>
          <div className={styles.systemStatusPills} title="FlowPilot Microservice & Database Connections">
            <span className={styles.statusPill}><span className={styles.dotGreen} /> Gemini</span>
            <span className={styles.statusPill}><span className={styles.dotGreen} /> Memory</span>
            <span className={styles.statusPill}><span className={styles.dotGreen} /> Database</span>
            <span className={styles.statusPill}><span className={styles.dotGreen} /> Automation</span>
          </div>

          <div className={styles.userArea}>
            <div className={styles.statusDot} />
            <span className={styles.workspaceName}>Raj Karwarkar / Workspace</span>
          </div>
        </div>
      </div>
    </header>
  );
};
