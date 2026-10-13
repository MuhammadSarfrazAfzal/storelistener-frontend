/**
 * Storelistener — Owner Dashboard Root Component (Module 1 Foundation)
 * File: src/components/dashboard/OwnerDashboard.jsx
 */

import { useState } from 'react';
import DashboardLayout from './DashboardLayout';
import DashboardOverview from './DashboardOverview';
import NavigationPlaceholder from './NavigationPlaceholder';
import LiveMonitoringPage from '../monitoring/LiveMonitoringPage';
import DealAnalysisReportsPage from '../reports/DealAnalysisReportsPage';
import SalespersonPerformancePage from '../performance/SalespersonPerformancePage';
import NotificationSettingsPage from '../settings/NotificationSettingsPage';
import CustomerSalesIntelligencePage from '../intelligence/CustomerSalesIntelligencePage';
import PendingManagersSection from './PendingManagersSection';
import PdfReportsPage from '../reports/PdfReportsPage';

const SECTION_TITLES = {
  dashboard: 'Store Overview',
  'live-monitoring': 'Live Monitoring',
  conversations: 'Conversations & Deal Analysis',
  intelligence: 'Customer & Sales Intelligence Dashboard',
  performance: 'Salesperson Performance & Quality Scorecards',
  stores: 'Stores & Manager Approvals',
  reports: 'Deal Reports & Analytics',
  'pdf-reports': 'Executive PDF Reports Hub',
  settings: 'Smart Alerts & Notification Settings',
};

export default function OwnerDashboard({ currentUser, token, onLogout }) {
  const [activeNav, setActiveNav] = useState('dashboard');

  const handleNavigate = (navId) => {
    setActiveNav(navId);
  };

  const currentSection = SECTION_TITLES[activeNav] || 'Store Overview';

  return (
    <DashboardLayout
      activeNav={activeNav}
      onNavigate={handleNavigate}
      currentSection={currentSection}
      onLogout={onLogout}
      token={token}
    >
      {activeNav === 'dashboard' ? (
        <DashboardOverview
          currentUser={currentUser}
          token={token}
          onNavigate={handleNavigate}
        />
      ) : activeNav === 'live-monitoring' ? (
        <LiveMonitoringPage
          currentUser={currentUser}
          token={token}
          onNavigate={handleNavigate}
        />
      ) : activeNav === 'performance' ? (
        <SalespersonPerformancePage
          currentUser={currentUser}
          token={token}
          onNavigate={handleNavigate}
        />
      ) : activeNav === 'intelligence' ? (
        <CustomerSalesIntelligencePage
          currentUser={currentUser}
          token={token}
          onNavigate={handleNavigate}
        />
      ) : activeNav === 'reports' || activeNav === 'conversations' ? (
        <DealAnalysisReportsPage
          currentUser={currentUser}
          token={token}
          onNavigate={handleNavigate}
          defaultTab={activeNav === 'conversations' ? 'conversations' : 'overview'}
        />
      ) : activeNav === 'pdf-reports' ? (
        <PdfReportsPage
          currentUser={currentUser}
          token={token}
          onNavigate={handleNavigate}
        />
      ) : activeNav === 'settings' ? (
        <NotificationSettingsPage
          currentUser={currentUser}
          token={token}
        />
      ) : activeNav === 'stores' ? (
        <PendingManagersSection
          currentUser={currentUser}
          token={token}
        />
      ) : (
        <NavigationPlaceholder
          sectionId={activeNav}
          onBackToDashboard={() => setActiveNav('dashboard')}
        />
      )}
    </DashboardLayout>
  );
}
