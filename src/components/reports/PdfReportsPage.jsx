/**
 * Storelistener — Dedicated Executive PDF Reports Section
 * File: src/components/reports/PdfReportsPage.jsx
 *
 * Implements:
 * 1. Unified Management Report Center matching Store Overview design system
 * 2. Complete catalogue of available business reports with clear descriptions
 * 3. Reactive Store Location and Date Range filter controls
 * 4. Asynchronous data fetching, progress indicators, and instant PDF download triggers
 * 5. Preservation of Excel / CSV export functionality
 * 6. Detailed error and success feedback handling
 */

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  Stack,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Snackbar,
  Alert,
  Divider,
} from '@mui/material';
import {
  PictureAsPdf as PdfIcon,
  Download as ExportIcon,
  Storefront as StoreIcon,
  BarChart as AnalyticsIcon,
  EmojiEvents as PerformanceIcon,
  Psychology as IntelligenceIcon,
  Sensors as LiveIcon,
  NotificationsActive as AlertsIcon,
  CheckCircle as SuccessIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';

import {
  downloadStoreOverviewReport,
  downloadDealAnalysisReport,
  downloadSalespersonPerformanceReport,
  downloadCustomerSalesIntelligenceReport,
  downloadLiveMonitoringReport,
  downloadNotificationsReport,
} from '../../utils/pdfReportService';

import { BACKEND_URL } from '../../config/api';

const REPORT_CATALOGUE = [
  {
    id: 'store-overview',
    title: 'Store Overview & Retail Network Audit',
    category: 'Module 1 • Real-Time Operations',
    icon: StoreIcon,
    accentColor: '#111827',
    badgeColor: '#F1F5F9',
    badgeText: '#0F172A',
    description:
      'Executive operational summary covering connected retail stores, desktop microphone sync states, workstation counts, and recent recorded customer interactions.',
    supportsStoreFilter: true,
    supportsDateFilter: false,
    fetchAndExport: async ({ storeFilter, dateFilter, currentUser, token }) => {
      const [storesRes, sessionsRes] = await Promise.all([
        fetch(`${BACKEND_URL}/api/stores/overview`, { credentials: 'include' }),
        fetch(`${BACKEND_URL}/api/sessions?limit=25`, { credentials: 'include' }),
      ]);
      const storesData = await storesRes.json();
      const sessionsData = await sessionsRes.json();

      let stores = storesData.stores || [];
      if (storeFilter !== 'all') {
        stores = stores.filter((s) => (s.code || s.id) === storeFilter);
      }

      const sessions = (sessionsData.sessions || []).map((s) => ({
        id: s._id || s.sessionId,
        storeName: s.storeName || (s.storeCode ? `iPhone Store ${s.storeCode.slice(-2)}` : 'Store'),
        salesRep: s.salesRep || 'Sales Specialist',
        startedAt: new Date(s.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        duration: s.durationSeconds ? `${Math.floor(s.durationSeconds / 60)}m ${s.durationSeconds % 60}s` : 'Active',
        dealStatus: s.dealAnalysis?.conversationOutcome || s.analytics?.dealOutcome || 'Under Review',
      }));

      downloadStoreOverviewReport({
        stores,
        recentConversations: sessions,
        filters: { store: storeFilter === 'all' ? 'All Retail Branches' : storeFilter },
        currentUser,
      });
    },
  },
  {
    id: 'deal-analysis',
    title: 'Deal Analysis & Conversion Audit Report',
    category: 'Module 6 • Deal Intelligence',
    icon: AnalyticsIcon,
    accentColor: '#7C3AED',
    badgeColor: '#F5F3FF',
    badgeText: '#6D28D9',
    description:
      'AI-evaluated conversation outcomes, customer buying intent classification, branch conversion rates, and conversation-level dialogue audits.',
    supportsStoreFilter: true,
    supportsDateFilter: true,
    supportsCsv: true,
    fetchAndExport: async ({ storeFilter, dateFilter, currentUser, token }) => {
      const params = new URLSearchParams();
      if (storeFilter !== 'all') params.append('store', storeFilter);
      if (dateFilter !== 'all') params.append('dateRange', dateFilter);

      const res = await fetch(`${BACKEND_URL}/api/analytics/deal-reports?${params.toString()}`, {
        credentials: 'include',
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to fetch deal report data');

      downloadDealAnalysisReport({
        metrics: data.metrics || {},
        intentBreakdown: data.intentBreakdown || [],
        storeComparisons: data.storeComparisons || [],
        conversations: data.conversations || [],
        filters: { store: storeFilter, dateRange: dateFilter },
        currentUser,
      });
    },
    exportCsv: ({ storeFilter, dateFilter }) => {
      const params = new URLSearchParams();
      if (storeFilter !== 'all') params.append('store', storeFilter);
      if (dateFilter !== 'all') params.append('dateRange', dateFilter);
      window.open(`${BACKEND_URL}/api/analytics/export-csv?${params.toString()}`, '_blank');
    },
  },
  {
    id: 'salesperson-performance',
    title: 'Salesperson Performance & Quality Scorecard Report',
    category: 'Module 7 • Sales Quality Scorecards',
    icon: PerformanceIcon,
    accentColor: '#2563EB',
    badgeColor: '#EFF6FF',
    badgeText: '#1D4ED8',
    description:
      'Objective 8-dimension sales rubric evaluation grounded in transcripts, specialist conversion leaderboards, coaching indications, and performance trends.',
    supportsStoreFilter: true,
    supportsDateFilter: true,
    fetchAndExport: async ({ storeFilter, dateFilter, currentUser, token }) => {
      const params = new URLSearchParams();
      if (storeFilter !== 'all') params.append('store', storeFilter);
      if (dateFilter !== 'all') params.append('dateRange', dateFilter);

      const authToken = token || localStorage.getItem('storelistener_token');
      const res = await fetch(`${BACKEND_URL}/api/scorecards/overview?${params.toString()}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed to fetch scorecard overview');

      downloadSalespersonPerformanceReport({
        salespeople: data.salespeople || [],
        totalSessions: data.totalSessionsEvaluated || 0,
        filters: { store: storeFilter, dateRange: dateFilter },
        currentUser,
      });
    },
  },
  {
    id: 'customer-intelligence',
    title: 'Customer & Sales Intelligence Report',
    category: 'Module 9 • Strategic Sales Intelligence',
    icon: IntelligenceIcon,
    accentColor: '#059669',
    badgeColor: '#ECFDF5',
    badgeText: '#047857',
    description:
      'In-depth product demand rankings, customer price sensitivities, recurring lost-sale objections, and competitive analysis derived from sales floor dialogue.',
    supportsStoreFilter: true,
    supportsDateFilter: true,
    supportsCsv: true,
    fetchAndExport: async ({ storeFilter, dateFilter, currentUser, token }) => {
      const params = new URLSearchParams();
      if (storeFilter !== 'all') params.append('storeCode', storeFilter);
      if (dateFilter !== 'all') params.append('dateRange', dateFilter);

      const authToken = token || localStorage.getItem('storelistener_token');
      const res = await fetch(`${BACKEND_URL}/api/intelligence/overview?${params.toString()}`, {
        credentials: 'include',
        headers: {
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
      });
      const data = await res.json();

      downloadCustomerSalesIntelligenceReport({
        summary: data.summary || {},
        productDemand: data.productDemand || [],
        storeComparison: data.storeComparison || [],
        lostSalesAndObjections: data.lostSalesAndObjections || [],
        customerRequirements: data.customerRequirements || [],
        filters: { store: storeFilter, dateRange: dateFilter },
        currentUser,
      });
    },
    exportCsv: async ({ storeFilter, dateFilter, token }) => {
      const authToken = token || localStorage.getItem('storelistener_token');
      const queryParams = new URLSearchParams();
      if (storeFilter && storeFilter !== 'all') queryParams.append('storeCode', storeFilter);
      if (dateFilter && dateFilter !== 'all') queryParams.append('dateRange', dateFilter);

      const res = await fetch(`${BACKEND_URL}/api/intelligence/export-csv?${queryParams.toString()}`, {
        credentials: 'include',
        headers: {
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
      });
      if (!res.ok) throw new Error('Failed to generate intelligence CSV');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sales_intelligence_report_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    },
  },
  {
    id: 'live-monitoring',
    title: 'Live Floor Monitoring & Audio Sessions Audit',
    category: 'Module 2 • Live Floor Monitoring',
    icon: LiveIcon,
    accentColor: '#DC2626',
    badgeColor: '#FEF2F2',
    badgeText: '#B91C1C',
    description:
      'Real-time snapshot of monitored store locations, workstation audio streams in active transmission, and floor counters in listening standby.',
    supportsStoreFilter: true,
    supportsDateFilter: false,
    fetchAndExport: async ({ storeFilter, currentUser }) => {
      const [storesRes, sessionsRes] = await Promise.all([
        fetch(`${BACKEND_URL}/api/stores/overview`, { credentials: 'include' }),
        fetch(`${BACKEND_URL}/api/sessions?status=active`, { credentials: 'include' }),
      ]);
      const storesData = await storesRes.json();
      const sessionsData = await sessionsRes.json();

      const byStore = { 'store-01': [], 'store-02': [], 'store-03': [] };
      (sessionsData.sessions || []).forEach((s) => {
        const sId = (s.storeCode || '').toLowerCase().includes('02')
          ? 'store-02'
          : (s.storeCode || '').toLowerCase().includes('03')
          ? 'store-03'
          : 'store-01';
        byStore[sId].push(s);
      });

      downloadLiveMonitoringReport({
        stores: storesData.stores || [],
        conversationsByStore: byStore,
        selectedStoreId: storeFilter,
        currentUser,
      });
    },
  },
  {
    id: 'alerts-audit',
    title: 'Smart Alerts & Notification Rules Audit',
    category: 'Module 8 • Smart Alerts & Notifications',
    icon: AlertsIcon,
    accentColor: '#D97706',
    badgeColor: '#FFFBEB',
    badgeText: '#B45309',
    description:
      'System alert configuration, triggered threshold events, severity levels, store isolation logs, and manager response history.',
    supportsStoreFilter: false,
    supportsDateFilter: false,
    fetchAndExport: async ({ currentUser, token }) => {
      const authToken = token || localStorage.getItem('storelistener_token');
      const [notifsRes, settingsRes] = await Promise.all([
        fetch(`${BACKEND_URL}/api/notifications?limit=50`, {
          credentials: 'include',
          headers: { ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}) },
        }),
        fetch(`${BACKEND_URL}/api/notifications/settings`, {
          credentials: 'include',
        }),
      ]);
      const notifsData = await notifsRes.json();
      const settingsData = await settingsRes.json();

      downloadNotificationsReport({
        notifications: notifsData.notifications || [],
        unreadCount: notifsData.unreadCount || 0,
        settings: settingsData.settings || {},
        currentUser,
      });
    },
  },
];

export default function PdfReportsPage({ currentUser, token, onNavigate }) {
  const [storeFilter, setStoreFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [loadingReportId, setLoadingReportId] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const [toastSeverity, setToastSeverity] = useState('success');

  const handleDownloadPdf = async (report) => {
    setLoadingReportId(report.id);
    try {
      await report.fetchAndExport({
        storeFilter,
        dateFilter,
        currentUser,
        token,
      });
      setToastSeverity('success');
      setToastMessage(`✓ ${report.title} downloaded successfully.`);
    } catch (err) {
      console.error('PDF report export error:', err);
      setToastSeverity('error');
      setToastMessage(`Failed to generate PDF: ${err.message || 'Network error'}`);
    } finally {
      setLoadingReportId(null);
    }
  };

  const handleExportCsv = async (report) => {
    if (!report.exportCsv) return;
    try {
      await report.exportCsv({
        storeFilter,
        dateFilter,
        token,
      });
      setToastSeverity('success');
      setToastMessage(`✓ CSV data exported successfully for ${report.title}.`);
    } catch (err) {
      console.error('CSV export error:', err);
      setToastSeverity('error');
      setToastMessage(`Export error: ${err.message}`);
    }
  };

  return (
    <Box sx={{ maxWidth: 1440, mx: 'auto', p: { xs: 2, sm: 3 } }}>
      {/* Header */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Box>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2,
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <PdfIcon />
            </Box>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary', letterSpacing: '-0.02em' }}>
                Executive PDF Reports
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.25 }}>
                Generate management-grade printable PDF audits with synchronized metrics, store scopes, and formatting.
              </Typography>
            </Box>
          </Stack>
        </Box>

        <Chip
          icon={<SuccessIcon sx={{ fontSize: '14px !important', color: '#15803D !important' }} />}
          label="Multi-Page Vector PDF Engine Active"
          sx={{
            height: 28,
            fontSize: '0.75rem',
            fontWeight: 600,
            bgcolor: '#F0FDF4',
            color: '#15803D',
            borderColor: '#BBF7D0',
            borderWidth: 1,
            borderStyle: 'solid',
          }}
        />
      </Stack>

      {/* Filter Toolbar */}
      <Paper
        variant="outlined"
        sx={{
          p: 2.5,
          mb: 4,
          borderRadius: 2,
          bgcolor: 'background.paper',
          borderColor: 'divider',
        }}
      >
        <Grid container spacing={2.5} alignItems="center">
          <Grid item xs={12} sm={6} md={3.5}>
            <FormControl fullWidth size="small">
              <InputLabel id="pdf-store-filter-label">Store Scope</InputLabel>
              <Select
                labelId="pdf-store-filter-label"
                value={storeFilter}
                label="Store Scope"
                onChange={(e) => setStoreFilter(e.target.value)}
              >
                <MenuItem value="all">All Retail Branches (Default)</MenuItem>
                <MenuItem value="STORE-01">iPhone Store 01 (Downtown)</MenuItem>
                <MenuItem value="STORE-02">iPhone Store 02 (Uptown)</MenuItem>
                <MenuItem value="STORE-03">iPhone Store 03 (Suburbs)</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={3.5}>
            <FormControl fullWidth size="small">
              <InputLabel id="pdf-date-filter-label">Reporting Period</InputLabel>
              <Select
                labelId="pdf-date-filter-label"
                value={dateFilter}
                label="Reporting Period"
                onChange={(e) => setDateFilter(e.target.value)}
              >
                <MenuItem value="all">All Time / Cumulative</MenuItem>
                <MenuItem value="today">Today (24 Hours)</MenuItem>
                <MenuItem value="7d">Last 7 Days</MenuItem>
                <MenuItem value="30d">Last 30 Days</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={5}>
            <Stack direction="row" spacing={1} justifyContent={{ xs: 'flex-start', md: 'flex-end' }}>
              <Button
                variant="outlined"
                size="small"
                startIcon={<RefreshIcon />}
                onClick={() => {
                  setStoreFilter('all');
                  setDateFilter('all');
                }}
                sx={{ textTransform: 'none', fontWeight: 600 }}
              >
                Reset Filters
              </Button>
            </Stack>
          </Grid>
        </Grid>
      </Paper>

      {/* Report Cards Grid */}
      <Grid container spacing={3}>
        {REPORT_CATALOGUE.map((report) => {
          const Icon = report.icon;
          const isGenerating = loadingReportId === report.id;

          return (
            <Grid item xs={12} md={6} lg={4} key={report.id}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  transition: 'border-color 150ms ease, box-shadow 150ms ease',
                  '&:hover': {
                    borderColor: '#CBD5E1',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                  },
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
                    <Box
                      sx={{
                        width: 44,
                        height: 44,
                        borderRadius: 2,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: report.badgeColor,
                        color: report.accentColor,
                      }}
                    >
                      <Icon sx={{ fontSize: 24 }} />
                    </Box>
                    <Chip
                      size="small"
                      label={report.category}
                      sx={{
                        fontSize: '0.6875rem',
                        fontWeight: 600,
                        bgcolor: report.badgeColor,
                        color: report.badgeText,
                        height: 22,
                      }}
                    />
                  </Stack>

                  <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary', mb: 1, lineHeight: 1.3 }}>
                    {report.title}
                  </Typography>

                  <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.5, minHeight: 64 }}>
                    {report.description}
                  </Typography>

                  <Divider sx={{ my: 2 }} />

                  {/* Capabilities Tags */}
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    <Chip
                      size="small"
                      label={report.supportsStoreFilter ? 'Store Filter Enabled' : 'Global Scope'}
                      sx={{ fontSize: '0.625rem', height: 20, bgcolor: '#F8FAFC', color: 'text.secondary' }}
                    />
                    {report.supportsDateFilter && (
                      <Chip
                        size="small"
                        label="Date Window Aware"
                        sx={{ fontSize: '0.625rem', height: 20, bgcolor: '#F8FAFC', color: 'text.secondary' }}
                      />
                    )}
                    {report.supportsCsv && (
                      <Chip
                        size="small"
                        label="CSV & Excel Export"
                        sx={{ fontSize: '0.625rem', height: 20, bgcolor: '#F0FDF4', color: '#15803D' }}
                      />
                    )}
                  </Stack>
                </CardContent>

                <CardActions sx={{ p: 2.5, pt: 0, gap: 1 }}>
                  <Button
                    fullWidth
                    variant="contained"
                    color="primary"
                    startIcon={isGenerating ? <CircularProgress size={16} color="inherit" /> : <PdfIcon />}
                    disabled={Boolean(loadingReportId)}
                    onClick={() => handleDownloadPdf(report)}
                    sx={{
                      fontWeight: 600,
                      fontSize: '0.8125rem',
                      textTransform: 'none',
                      py: 1,
                    }}
                  >
                    {isGenerating ? 'Generating PDF...' : 'Download PDF'}
                  </Button>

                  {report.supportsCsv && (
                    <Button
                      variant="outlined"
                      startIcon={<ExportIcon />}
                      disabled={Boolean(loadingReportId)}
                      onClick={() => handleExportCsv(report)}
                      sx={{
                        fontWeight: 600,
                        fontSize: '0.8125rem',
                        textTransform: 'none',
                        py: 1,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Excel / CSV
                    </Button>
                  )}
                </CardActions>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {/* Feedback Toast */}
      <Snackbar
        open={Boolean(toastMessage)}
        autoHideDuration={4500}
        onClose={() => setToastMessage(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setToastMessage(null)}
          severity={toastSeverity}
          variant="filled"
          sx={{ width: '100%', fontWeight: 500 }}
        >
          {toastMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}
