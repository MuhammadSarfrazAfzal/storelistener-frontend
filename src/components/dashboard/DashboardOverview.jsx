/**
 * Storelistener — Main Dashboard Overview Component
 * File: src/components/dashboard/DashboardOverview.jsx
 */

import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import {
  Box,
  Typography,
  Grid,
  Stack,
  Alert,
  Button,
  Snackbar,
  Chip,
} from '@mui/material';
import {
  Sensors as LiveMonitorIcon,
  Forum as HistoryIcon,
  CheckCircle as LiveIcon,
  PictureAsPdf as PdfIcon,
} from '@mui/icons-material';

import { downloadStoreOverviewReport } from '../../utils/pdfReportService';

import StatCard from './StatCard';
import StoreCard from './StoreCard';
import RecentConversationsTable from './RecentConversationsTable';
import PendingManagersSection from './PendingManagersSection';
import {
  MOCK_KPIS,
  MOCK_RECENT_CONVERSATIONS,
} from '../../data/mockDashboardData';

import { BACKEND_URL, DEFAULT_SOCKET_OPTIONS } from '../../config/api';

export default function DashboardOverview({ onNavigate, currentUser, token }) {
  const [toastMessage, setToastMessage] = useState(null);
  const [stores, setStores] = useState([]);
  const [recentConversations, setRecentConversations] = useState([]);
  const [socketConnected, setSocketConnected] = useState(false);

  // Fetch initial stores overview and recent sessions
  const fetchStoresOverview = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/stores/overview`, { credentials: 'include' });
      const data = await res.json();
      if (data.success && Array.isArray(data.stores)) {
        setStores(data.stores);
      }
    } catch (err) {
      console.warn('Stores overview fetch error:', err.message);
    }
  };

  const fetchRecentSessions = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/sessions?limit=6`, { credentials: 'include' });
      const data = await res.json();
      if (data.success && Array.isArray(data.sessions) && data.sessions.length > 0) {
        // Map backend schema to table format
        const formatted = data.sessions.map((s) => ({
          id: s._id || s.sessionId,
          title: s.title || `Conversation - ${new Date(s.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
          storeName: s.storeName || (s.storeCode ? `iPhone Store ${s.storeCode.slice(-2)}` : 'Store'),
          workstation: s.workstation || 'Counter 01',
          salesRep: s.salesRep || 'Sales Specialist',
          startedAt: new Date(s.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          duration: s.durationSeconds ? `${Math.floor(s.durationSeconds / 60)}m ${s.durationSeconds % 60}s` : 'Active',
          dealStatus: s.analytics?.dealOutcome === 'Closed' ? 'Closed' : s.analytics?.dealOutcome === 'Not Closed' ? 'Not Closed' : 'Under Review',
          topicsCount: s.analytics?.topics?.length || 1,
        }));
        setRecentConversations(formatted);
      } else {
        setRecentConversations(MOCK_RECENT_CONVERSATIONS);
      }
    } catch (err) {
      setRecentConversations(MOCK_RECENT_CONVERSATIONS);
    }
  };

  useEffect(() => {
    fetchStoresOverview();
    fetchRecentSessions();

    const authToken = token || localStorage.getItem('storelistener_token');
    const socket = io(BACKEND_URL, {
      ...DEFAULT_SOCKET_OPTIONS,
      auth: authToken ? { token: authToken } : undefined,
    });

    socket.on('connect', () => {
      setSocketConnected(true);
    });

    socket.on('disconnect', () => {
      setSocketConnected(false);
    });

    // Real-time store status broadcasts
    socket.on('stores_overview_update', (data) => {
      if (Array.isArray(data)) {
        setStores(data);
      } else if (data && data.stores) {
        setStores(data.stores);
      }
    });

    socket.on('store_status_update', (updatedStore) => {
      if (updatedStore && updatedStore.id) {
        setStores((prev) =>
          prev.map((s) => (s.id === updatedStore.id || s.code === updatedStore.code ? { ...s, ...updatedStore } : s))
        );
      }
    });

    socket.on('session_started', (sessionData) => {
      fetchStoresOverview();
      setToastMessage(`🎙️ Live session started at ${sessionData.storeId || 'Store'}!`);
    });

    socket.on('session_ended', () => {
      fetchStoresOverview();
      fetchRecentSessions();
    });

    return () => {
      socket.disconnect();
    };
  }, [token]);

  const handleStoreAction = (store) => {
    if (onNavigate) {
      onNavigate('live-monitoring');
    } else {
      setToastMessage(`Selected "${store.name}". Opening Live Monitoring.`);
    }
  };

  const handleInspectConversation = (conv) => {
    setToastMessage(`Viewing conversation #${conv.id} (${conv.storeName}).`);
  };

  // Compute live KPIs
  const onlineStoresCount = stores.filter((s) => s.status === 'Online').length;
  const activeConversationsTotal = stores.reduce((sum, s) => sum + (s.activeConversations || 0), 0);

  const dynamicKpis = [
    {
      id: 'active_sessions',
      label: 'Live Conversations',
      value: activeConversationsTotal.toString(),
      supportingText: activeConversationsTotal > 0 ? 'Conversations streaming live right now' : 'Floor counters in standby listening',
      iconName: 'Sensors',
      category: 'primary',
    },
    {
      id: 'stores_online',
      label: 'Connected Stores',
      value: `${onlineStoresCount} / ${Math.max(stores.length, 3)}`,
      supportingText: socketConnected ? 'WebSocket heartbeat active' : 'Connecting to real-time sync...',
      iconName: 'Storefront',
      category: 'accent',
    },
    MOCK_KPIS[2],
    MOCK_KPIS[3],
  ];

  const handleDownloadPdf = () => {
    try {
      downloadStoreOverviewReport({
        stores,
        kpis: dynamicKpis,
        recentConversations,
        filters: { store: 'All Retail Branches (3)', period: 'Real-Time Sync' },
        currentUser,
      });
      setToastMessage('✓ Store Overview PDF report downloaded successfully.');
    } catch (err) {
      console.error('PDF generation error:', err);
      setToastMessage('Failed to generate Store Overview PDF report.');
    }
  };

  return (
    <Box sx={{ maxWidth: 1440, mx: 'auto' }}>
      {/* A. Welcome Section & Header */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Box>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary', letterSpacing: '-0.02em' }}>
              Store Overview
            </Typography>
            <Chip
              size="small"
              icon={<LiveIcon sx={{ fontSize: '13px !important', color: socketConnected ? '#16A34A !important' : '#DC2626 !important' }} />}
              label={socketConnected ? 'Real-Time Sync Live' : 'Reconnecting...'}
              sx={{
                height: 24,
                fontSize: '0.75rem',
                fontWeight: 600,
                bgcolor: socketConnected ? '#F0FDF4' : '#FEF2F2',
                color: socketConnected ? '#15803D' : '#B91C1C',
                borderColor: socketConnected ? '#BBF7D0' : '#FECACA',
                borderWidth: 1,
                borderStyle: 'solid',
              }}
            />
          </Stack>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
            Real-time synchronization across retail branches, counter desktop apps, and live transcripts.
          </Typography>
        </Box>

        {/* Quick Navigation Shortcuts */}
        <Stack direction="row" spacing={1.5}>
          <Button
            size="small"
            variant="outlined"
            startIcon={<PdfIcon />}
            onClick={handleDownloadPdf}
            sx={{ fontWeight: 600, fontSize: '0.8125rem' }}
          >
            Download PDF
          </Button>
          <Button
            size="small"
            variant="outlined"
            startIcon={<LiveMonitorIcon />}
            onClick={() => onNavigate && onNavigate('live-monitoring')}
            sx={{ fontWeight: 600, fontSize: '0.8125rem' }}
          >
            Live Monitoring
          </Button>
          <Button
            size="small"
            variant="contained"
            startIcon={<HistoryIcon />}
            onClick={() => onNavigate && onNavigate('conversations')}
            sx={{ fontWeight: 600, fontSize: '0.8125rem' }}
          >
            Conversation History
          </Button>
        </Stack>
      </Stack>

      {/* Module 5 Live Synchronization Notice */}
      <Alert
        severity="success"
        icon={<LiveIcon fontSize="small" />}
        sx={{
          mb: 3.5,
          borderRadius: 2,
          py: 0.75,
          px: 2,
          fontSize: '0.8125rem',
        }}
      >
        <strong>Module 5 Real-Time Owner Synchronization: </strong>
        Connected directly to Express & MongoDB backend. Store statuses, desktop heartbeats, and conversation recordings synchronize live.
      </Alert>

      {/* B. KPI Cards Section */}
      <Grid container spacing={2.5} sx={{ mb: 4 }}>
        {dynamicKpis.map((kpi) => (
          <Grid item xs={12} sm={6} lg={3} key={kpi.id}>
            <StatCard
              label={kpi.label}
              value={kpi.value}
              supportingText={kpi.supportingText}
              iconName={kpi.iconName}
              category={kpi.category}
            />
          </Grid>
        ))}
      </Grid>

      {/* Pending Sales Manager Requests & Approval Workflow (Module 10) */}
      <PendingManagersSection currentUser={currentUser} token={token} />

      {/* C. Three-Store Overview Section */}
      <Box sx={{ mb: 4 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Retail Store Locations
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
              Real-time connection state, desktop heartbeats, and conversation state across all 3 retail branches
            </Typography>
          </Box>
        </Stack>

        <Grid container spacing={2.5}>
          {(stores.length > 0 ? stores : [
            { id: 'store-01', code: 'STORE-01', name: 'iPhone Store 01', status: 'Offline', currentState: 'Offline' },
            { id: 'store-02', code: 'STORE-02', name: 'iPhone Store 02', status: 'Offline', currentState: 'Offline' },
            { id: 'store-03', code: 'STORE-03', name: 'iPhone Store 03', status: 'Offline', currentState: 'Offline' },
          ]).map((store) => (
            <Grid item xs={12} md={4} key={store.id || store.code}>
              <StoreCard store={store} onAction={handleStoreAction} />
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* D. Recent Conversations Preview */}
      <Box sx={{ mb: 2 }}>
        <RecentConversationsTable
          conversations={recentConversations}
          onInspect={handleInspectConversation}
          onViewAll={() => onNavigate && onNavigate('conversations')}
        />
      </Box>

      {/* Non-intrusive feedback toast */}
      <Snackbar
        open={Boolean(toastMessage)}
        autoHideDuration={4000}
        onClose={() => setToastMessage(null)}
        message={toastMessage}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      />
    </Box>
  );
}
