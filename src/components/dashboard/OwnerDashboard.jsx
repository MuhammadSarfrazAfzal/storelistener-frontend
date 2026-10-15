/**
 * Storelistener — Owner Dashboard Root Component (Module 1 Foundation)
 * File: src/components/dashboard/OwnerDashboard.jsx
 */

import { useState } from 'react';
import { Box } from '@mui/material';
import DashboardLayout from './DashboardLayout';
import DashboardOverview from './DashboardOverview';
import NavigationPlaceholder from './NavigationPlaceholder';
import LiveMonitoringPage from '../monitoring/LiveMonitoringPage';
import DailyReportsPage from '../reports/DailyReportsPage';
import ConversationList from '../ConversationList';
import NotificationSettingsPage from '../settings/NotificationSettingsPage';
import PendingManagersSection from './PendingManagersSection';

const SECTION_TITLES = {
  dashboard: 'Store Overview',
  'live-monitoring': 'Live Monitoring',
  conversations: 'Conversations & Recordings',
  reports: 'Daily Reports',
  stores: 'Stores & Manager Approvals',
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
      ) : activeNav === 'conversations' ? (
        <Box sx={{ p: { xs: 1, sm: 2 } }}>
          <ConversationList
            currentUser={currentUser}
            token={token}
          />
        </Box>
      ) : activeNav === 'reports' ? (
        <DailyReportsPage
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
