/**
 * Storelistener — Deal Analysis & Reporting Workspace (Module 6)
 * File: src/components/reports/DealAnalysisReportsPage.jsx
 *
 * Implements:
 * 1. Real-time Deal Analysis Insights & Sales Reporting
 * 2. Multi-dimensional filtering (Store, Date Range, Outcome, Buying Intent)
 * 3. KPI Overview Cards (Total Conversations, Confirmed Sales, Follow-up, Unconverted, Intent)
 * 4. Buying Intent Distribution & Store-wise Performance Comparison
 * 5. Detailed Conversation Deal Analysis Modal with AI extracts, key moments & original dialogue
 * 6. Verified CSV Export matching active filters
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Stack,
  Card,
  CardHeader,
  CardContent,
  Button,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
  Divider,
  LinearProgress,
  Alert,
} from '@mui/material';
import {
  BarChart as ReportsIcon,
  Download as ExportIcon,
  Refresh as RefreshIcon,
  CheckCircle as SaleConfirmedIcon,
  HourglassEmpty as FollowUpIcon,
  Cancel as NotConvertedIcon,
  HelpOutline as UnclearIcon,
  AutoAwesome as AiIcon,
  Close as CloseIcon,
  Psychology as IntentIcon,
  Storefront as StoreIcon,
  AttachMoney as PriceIcon,
  QuestionAnswer as QuestionIcon,
  ArrowForward as ArrowIcon,
  PlayArrow as PlayIcon,
  Replay as ReplayIcon,
} from '@mui/icons-material';

const BACKEND_URL = 'http://localhost:5000';

const OUTCOME_CONFIG = {
  'Sale Confirmed': {
    color: '#15803D',
    bgColor: '#F0FDF4',
    borderColor: '#BBF7D0',
    icon: SaleConfirmedIcon,
  },
  'Follow-up Required': {
    color: '#B45309',
    bgColor: '#FFFBEB',
    borderColor: '#FDE68A',
    icon: FollowUpIcon,
  },
  'Not Converted': {
    color: '#B91C1C',
    bgColor: '#FEF2F2',
    borderColor: '#FECACA',
    icon: NotConvertedIcon,
  },
  Unclear: {
    color: '#64748B',
    bgColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    icon: UnclearIcon,
  },
};

const INTENT_CONFIG = {
  High: {
    color: '#1D4ED8',
    bgColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  Medium: {
    color: '#D97706',
    bgColor: '#FFFBEB',
    borderColor: '#FDE68A',
  },
  Low: {
    color: '#B91C1C',
    bgColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  Unclear: {
    color: '#64748B',
    bgColor: '#F1F5F9',
    borderColor: '#CBD5E1',
  },
};

export default function DealAnalysisReportsPage({ currentUser, token, socket }) {
  // Filter state
  const [selectedStore, setSelectedStore] = useState('all');
  const [dateRange, setDateRange] = useState('all');
  const [selectedOutcome, setSelectedOutcome] = useState('all');
  const [selectedIntent, setSelectedIntent] = useState('all');
  const [searchRep, setSearchRep] = useState('');

  // Data state
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState({
    metrics: {
      totalCompleted: 0,
      confirmedSales: 0,
      followUpRequired: 0,
      notConverted: 0,
      unclearOutcome: 0,
      conversionRate: 0,
      followUpRate: 0,
    },
    intentBreakdown: [],
    storeComparisons: [],
    conversations: [],
  });

  // Modal inspection state
  const [activeSession, setActiveSession] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [analyzingSessionId, setAnalyzingSessionId] = useState(null);
  const [activeTab, setActiveTab] = useState('analysis'); // 'analysis' | 'transcript'

  // Fetch report data from backend
  const fetchReportData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedStore !== 'all') params.append('store', selectedStore);
      if (dateRange !== 'all') params.append('dateRange', dateRange);
      if (selectedOutcome !== 'all') params.append('outcome', selectedOutcome);
      if (selectedIntent !== 'all') params.append('buyingIntent', selectedIntent);
      if (searchRep.trim()) params.append('salesperson', searchRep.trim());

      const res = await fetch(`${BACKEND_URL}/api/analytics/deal-reports?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setReportData(data);
      }
    } catch (err) {
      console.warn('Deal reports fetch notice:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, [selectedStore, dateRange, selectedOutcome, selectedIntent]);

  // Real-time socket updates for deal analysis
  useEffect(() => {
    if (!socket) return;

    const handleAnalysisUpdate = () => {
      fetchReportData();
    };

    socket.on('deal_analysis_updated', handleAnalysisUpdate);
    socket.on('session_ended', handleAnalysisUpdate);

    return () => {
      socket.off('deal_analysis_updated', handleAnalysisUpdate);
      socket.off('session_ended', handleAnalysisUpdate);
    };
  }, [socket]);

  // Export CSV
  const handleExportCsv = () => {
    const params = new URLSearchParams();
    if (selectedStore !== 'all') params.append('store', selectedStore);
    if (dateRange !== 'all') params.append('dateRange', dateRange);
    if (selectedOutcome !== 'all') params.append('outcome', selectedOutcome);
    if (selectedIntent !== 'all') params.append('buyingIntent', selectedIntent);
    if (searchRep.trim()) params.append('salesperson', searchRep.trim());

    window.open(`${BACKEND_URL}/api/analytics/export-csv?${params.toString()}`, '_blank');
  };

  // Open conversation details
  const handleInspectConversation = async (conversation) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/sessions/${conversation.id}/analysis`);
      const data = await res.json();
      if (data.success) {
        setActiveSession({
          ...conversation,
          ...data.session,
          dealAnalysis: data.dealAnalysis || conversation.dealAnalysis,
        });
      } else {
        setActiveSession(conversation);
      }
    } catch (e) {
      setActiveSession(conversation);
    }
    setActiveTab('analysis');
    setDetailModalOpen(true);
  };

  // Trigger / Retry analysis manually
  const handleTriggerAnalysis = async (sessionId) => {
    setAnalyzingSessionId(sessionId);
    try {
      const res = await fetch(`${BACKEND_URL}/api/sessions/${sessionId}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force: true }),
      });
      const data = await res.json();
      if (data.success && data.dealAnalysis) {
        // Update modal state if open
        if (activeSession && (activeSession.id === sessionId || activeSession.sessionId === sessionId)) {
          setActiveSession((prev) => ({
            ...prev,
            dealAnalysis: data.dealAnalysis,
          }));
        }
        fetchReportData();
      }
    } catch (err) {
      console.error('Analysis trigger error:', err);
    } finally {
      setAnalyzingSessionId(null);
    }
  };

  const { metrics, intentBreakdown, storeComparisons, conversations } = reportData;

  return (
    <Box sx={{ maxWidth: 1440, mx: 'auto' }}>
      {/* 1. Page Header & Actions */}
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
              Deal Analysis & Reporting
            </Typography>
            <Chip
              size="small"
              icon={<AiIcon sx={{ fontSize: '13px !important', color: '#7C3AED !important' }} />}
              label="Module 6 Intelligence"
              sx={{
                height: 24,
                fontSize: '0.75rem',
                fontWeight: 600,
                bgcolor: '#F5F3FF',
                color: '#6D28D9',
                borderColor: '#DDD6FE',
                borderWidth: 1,
                borderStyle: 'solid',
              }}
            />
          </Stack>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
            Audit completed counter conversations, track verified sale conversions, and inspect extracted retail intelligence.
          </Typography>
        </Box>

        <Stack direction="row" spacing={1.5}>
          <Button
            size="small"
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchReportData}
            sx={{ fontWeight: 600, fontSize: '0.8125rem' }}
          >
            Refresh
          </Button>
          <Button
            size="small"
            variant="contained"
            color="primary"
            startIcon={<ExportIcon />}
            onClick={handleExportCsv}
            sx={{ fontWeight: 600, fontSize: '0.8125rem' }}
          >
            Export CSV
          </Button>
        </Stack>
      </Stack>

      {/* 2. Interactive Filter Toolbar */}
      <Paper
        variant="outlined"
        sx={{
          p: 2,
          mb: 3.5,
          borderRadius: 2,
          bgcolor: 'background.paper',
        }}
      >
        <Grid container spacing={2} alignItems="center">
          {/* Store Location */}
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel id="store-filter-label">Store Location</InputLabel>
              <Select
                labelId="store-filter-label"
                value={selectedStore}
                label="Store Location"
                onChange={(e) => setSelectedStore(e.target.value)}
              >
                <MenuItem value="all">All Retail Branches</MenuItem>
                <MenuItem value="STORE-01">iPhone Store 01 (5th Ave)</MenuItem>
                <MenuItem value="STORE-02">iPhone Store 02 (Beverly Hills)</MenuItem>
                <MenuItem value="STORE-03">iPhone Store 03 (Brickell)</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {/* Date Range */}
          <Grid item xs={12} sm={6} md={2.25}>
            <FormControl fullWidth size="small">
              <InputLabel id="date-range-label">Date Range</InputLabel>
              <Select
                labelId="date-range-label"
                value={dateRange}
                label="Date Range"
                onChange={(e) => setDateRange(e.target.value)}
              >
                <MenuItem value="all">All Time</MenuItem>
                <MenuItem value="today">Today</MenuItem>
                <MenuItem value="7d">Last 7 Days</MenuItem>
                <MenuItem value="30d">Last 30 Days</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {/* Outcome Filter */}
          <Grid item xs={12} sm={6} md={2.25}>
            <FormControl fullWidth size="small">
              <InputLabel id="outcome-filter-label">Outcome</InputLabel>
              <Select
                labelId="outcome-filter-label"
                value={selectedOutcome}
                label="Outcome"
                onChange={(e) => setSelectedOutcome(e.target.value)}
              >
                <MenuItem value="all">All Outcomes</MenuItem>
                <MenuItem value="Sale Confirmed">Sale Confirmed</MenuItem>
                <MenuItem value="Follow-up Required">Follow-up Required</MenuItem>
                <MenuItem value="Not Converted">Not Converted</MenuItem>
                <MenuItem value="Unclear">Unclear</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {/* Buying Intent Filter */}
          <Grid item xs={12} sm={6} md={2.25}>
            <FormControl fullWidth size="small">
              <InputLabel id="intent-filter-label">Buying Intent</InputLabel>
              <Select
                labelId="intent-filter-label"
                value={selectedIntent}
                label="Buying Intent"
                onChange={(e) => setSelectedIntent(e.target.value)}
              >
                <MenuItem value="all">All Intent Levels</MenuItem>
                <MenuItem value="High">High</MenuItem>
                <MenuItem value="Medium">Medium</MenuItem>
                <MenuItem value="Low">Low</MenuItem>
                <MenuItem value="Unclear">Unclear</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {/* Salesperson Filter */}
          <Grid item xs={12} sm={6} md={2.25}>
            <TextField
              fullWidth
              size="small"
              label="Salesperson"
              placeholder="Filter by rep..."
              value={searchRep}
              onChange={(e) => setSearchRep(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') fetchReportData();
              }}
            />
          </Grid>
        </Grid>
      </Paper>

      {/* Loading Bar */}
      {loading && <LinearProgress sx={{ mb: 2, borderRadius: 1 }} />}

      {/* 3. KPI Overview Cards */}
      <Grid container spacing={2.5} sx={{ mb: 4 }}>
        {/* Total Completed */}
        <Grid item xs={12} sm={6} md={2.4}>
          <Card sx={{ height: '100%', p: 2 }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
              COMPLETED SESSIONS
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 700, mt: 0.5, color: 'text.primary' }}>
              {metrics.totalCompleted}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', mt: 0.5, display: 'block' }}>
              Persisted in database
            </Typography>
          </Card>
        </Grid>

        {/* Confirmed Sales */}
        <Grid item xs={12} sm={6} md={2.4}>
          <Card sx={{ height: '100%', p: 2, bgcolor: '#F0FDF4', borderColor: '#BBF7D0' }} variant="outlined">
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="caption" sx={{ color: '#15803D', fontWeight: 700 }}>
                CONFIRMED SALES
              </Typography>
              <SaleConfirmedIcon sx={{ fontSize: 18, color: '#16A34A' }} />
            </Stack>
            <Typography variant="h4" sx={{ fontWeight: 700, mt: 0.5, color: '#15803D' }}>
              {metrics.confirmedSales}
            </Typography>
            <Typography variant="caption" sx={{ color: '#16A34A', mt: 0.5, display: 'block', fontWeight: 600 }}>
              {metrics.conversionRate}% verified conversion rate
            </Typography>
          </Card>
        </Grid>

        {/* Follow-up Required */}
        <Grid item xs={12} sm={6} md={2.4}>
          <Card sx={{ height: '100%', p: 2, bgcolor: '#FFFBEB', borderColor: '#FDE68A' }} variant="outlined">
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="caption" sx={{ color: '#B45309', fontWeight: 700 }}>
                FOLLOW-UP REQUIRED
              </Typography>
              <FollowUpIcon sx={{ fontSize: 18, color: '#D97706' }} />
            </Stack>
            <Typography variant="h4" sx={{ fontWeight: 700, mt: 0.5, color: '#B45309' }}>
              {metrics.followUpRequired}
            </Typography>
            <Typography variant="caption" sx={{ color: '#D97706', mt: 0.5, display: 'block', fontWeight: 600 }}>
              {metrics.followUpRate}% pending pipeline
            </Typography>
          </Card>
        </Grid>

        {/* Not Converted */}
        <Grid item xs={12} sm={6} md={2.4}>
          <Card sx={{ height: '100%', p: 2, bgcolor: '#FEF2F2', borderColor: '#FECACA' }} variant="outlined">
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="caption" sx={{ color: '#B91C1C', fontWeight: 700 }}>
                NOT CONVERTED
              </Typography>
              <NotConvertedIcon sx={{ fontSize: 18, color: '#DC2626' }} />
            </Stack>
            <Typography variant="h4" sx={{ fontWeight: 700, mt: 0.5, color: '#B91C1C' }}>
              {metrics.notConverted}
            </Typography>
            <Typography variant="caption" sx={{ color: '#DC2626', mt: 0.5, display: 'block', fontWeight: 600 }}>
              {metrics.totalCompleted > 0 ? Math.round((metrics.notConverted / metrics.totalCompleted) * 100) : 0}% unclosed
            </Typography>
          </Card>
        </Grid>

        {/* High Buying Intent */}
        <Grid item xs={12} sm={6} md={2.4}>
          <Card sx={{ height: '100%', p: 2, bgcolor: '#F5F3FF', borderColor: '#DDD6FE' }} variant="outlined">
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="caption" sx={{ color: '#6D28D9', fontWeight: 700 }}>
                HIGH INTENT RATE
              </Typography>
              <IntentIcon sx={{ fontSize: 18, color: '#7C3AED' }} />
            </Stack>
            <Typography variant="h4" sx={{ fontWeight: 700, mt: 0.5, color: '#6D28D9' }}>
              {intentBreakdown.find((i) => i.level === 'High')?.count || 0}
            </Typography>
            <Typography variant="caption" sx={{ color: '#7C3AED', mt: 0.5, display: 'block', fontWeight: 600 }}>
              {intentBreakdown.find((i) => i.level === 'High')?.percentage || 0}% purchase readiness
            </Typography>
          </Card>
        </Grid>
      </Grid>

      {/* 4. Visual Insights: Buying Intent Distribution & Store Comparison */}
      <Grid container spacing={2.5} sx={{ mb: 4 }}>
        {/* Panel A: Buying Intent Distribution */}
        <Grid item xs={12} md={5}>
          <Card sx={{ height: '100%' }}>
            <CardHeader
              title={
                <Stack direction="row" alignItems="center" spacing={1}>
                  <IntentIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    Customer Buying Intent Distribution
                  </Typography>
                </Stack>
              }
              subheader={
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  AI-evaluated readiness across all completed dialogues
                </Typography>
              }
              sx={{ p: 2.5, pb: 1 }}
            />
            <Divider />
            <CardContent sx={{ p: 2.5 }}>
              <Stack spacing={2.25}>
                {intentBreakdown.map((item) => {
                  const cfg = INTENT_CONFIG[item.level] || INTENT_CONFIG.Unclear;
                  return (
                    <Box key={item.level}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.75 }}>
                        <Chip
                          size="small"
                          label={`${item.level} Intent`}
                          sx={{
                            height: 20,
                            fontSize: '0.6875rem',
                            fontWeight: 700,
                            bgcolor: cfg.bgColor,
                            color: cfg.color,
                            borderColor: cfg.borderColor,
                            borderWidth: 1,
                            borderStyle: 'solid',
                          }}
                        />
                        <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                          {item.count} ({item.percentage}%)
                        </Typography>
                      </Stack>
                      <LinearProgress
                        variant="determinate"
                        value={item.percentage}
                        sx={{
                          height: 7,
                          borderRadius: 1,
                          bgcolor: '#F1F5F9',
                          '& .MuiLinearProgress-bar': {
                            bgcolor: cfg.color,
                          },
                        }}
                      />
                    </Box>
                  );
                })}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Panel B: Store-Wise Comparison */}
        <Grid item xs={12} md={7}>
          <Card sx={{ height: '100%' }}>
            <CardHeader
              title={
                <Stack direction="row" alignItems="center" spacing={1}>
                  <StoreIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    Store-Wise Conversation & Outcome Comparison
                  </Typography>
                </Stack>
              }
              subheader={
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  Performance benchmarks across the 3 configured retail branches
                </Typography>
              }
              sx={{ p: 2.5, pb: 1 }}
            />
            <Divider />
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: '#F8FAFC' }}>
                    <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>STORE</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>TOTAL</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>CONFIRMED</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>FOLLOW-UP</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>CONV. RATE</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {storeComparisons.map((st) => (
                    <TableRow key={st.code} hover>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
                          {st.name}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'monospace' }}>
                          {st.code}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {st.total}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          size="small"
                          label={st.confirmed}
                          sx={{ height: 20, bgcolor: '#F0FDF4', color: '#15803D', fontWeight: 700, fontSize: '0.75rem' }}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          size="small"
                          label={st.followUp}
                          sx={{ height: 20, bgcolor: '#FFFBEB', color: '#B45309', fontWeight: 700, fontSize: '0.75rem' }}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2" sx={{ fontWeight: 700, color: st.conversionRate > 0 ? '#15803D' : 'text.secondary' }}>
                          {st.conversionRate}%
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        </Grid>
      </Grid>

      {/* 5. Analyzed Conversations Directory Table */}
      <Card sx={{ mb: 4 }}>
        <CardHeader
          title={
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Stack direction="row" alignItems="center" spacing={1}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Analyzed Conversations Directory
                </Typography>
                <Chip
                  size="small"
                  label={`${conversations.length} records`}
                  sx={{ bgcolor: '#F1F5F9', fontWeight: 600, height: 20, fontSize: '0.6875rem' }}
                />
              </Stack>
            </Stack>
          }
          subheader={
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Select a session to inspect detailed customer requirements, objections, and buying intent
            </Typography>
          }
          sx={{ p: 2.5, pb: 1.5 }}
        />
        <Divider />

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: '#F8FAFC' }}>
                <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>CONVERSATION / TIME</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>STORE & REP</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>PRODUCTS DISCUSSED</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>BUYING INTENT</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: '0.75rem' }}>DEAL OUTCOME</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>ACTIONS</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {conversations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      No completed conversations match the selected filter criteria.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                conversations.map((conv) => {
                  const outcomeCfg = OUTCOME_CONFIG[conv.conversationOutcome] || OUTCOME_CONFIG.Unclear;
                  const OutcomeIcon = outcomeCfg.icon;
                  const intentCfg = INTENT_CONFIG[conv.customerBuyingIntent] || INTENT_CONFIG.Unclear;
                  const isAnalyzing = analyzingSessionId === conv.id;

                  const dateFormatted = conv.startedAt
                    ? new Date(conv.startedAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                    : 'Recent';

                  return (
                    <TableRow key={conv.id} hover>
                      {/* Title & Time */}
                      <TableCell>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
                          {conv.summary && conv.summary !== 'Not mentioned'
                            ? conv.summary.slice(0, 52) + '...'
                            : `Conversation #${conv.id.slice(-6)}`}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.25 }}>
                          {dateFormatted} • {Math.round(conv.durationSeconds)}s
                        </Typography>
                      </TableCell>

                      {/* Store & Rep */}
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {conv.storeName || conv.storeCode}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          {conv.salesRep}
                        </Typography>
                      </TableCell>

                      {/* Products Discussed */}
                      <TableCell>
                        <Stack direction="row" spacing={0.5} flexWrap="wrap" gap={0.5}>
                          {(conv.productsDiscussed && conv.productsDiscussed.length > 0) ? (
                            conv.productsDiscussed.map((prod, idx) => (
                              <Chip
                                key={idx}
                                size="small"
                                label={prod}
                                sx={{ height: 20, fontSize: '0.6875rem', bgcolor: '#F1F5F9' }}
                              />
                            ))
                          ) : (
                            <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                              Not mentioned
                            </Typography>
                          )}
                        </Stack>
                      </TableCell>

                      {/* Buying Intent */}
                      <TableCell>
                        <Chip
                          size="small"
                          label={conv.customerBuyingIntent || 'Unclear'}
                          sx={{
                            height: 22,
                            fontSize: '0.6875rem',
                            fontWeight: 700,
                            bgcolor: intentCfg.bgColor,
                            color: intentCfg.color,
                            borderColor: intentCfg.borderColor,
                            borderWidth: 1,
                            borderStyle: 'solid',
                          }}
                        />
                      </TableCell>

                      {/* Outcome */}
                      <TableCell>
                        <Chip
                          size="small"
                          icon={<OutcomeIcon sx={{ fontSize: '12px !important', color: `${outcomeCfg.color} !important` }} />}
                          label={conv.conversationOutcome || 'Unclear'}
                          sx={{
                            height: 22,
                            fontSize: '0.6875rem',
                            fontWeight: 700,
                            bgcolor: outcomeCfg.bgColor,
                            color: outcomeCfg.color,
                            borderColor: outcomeCfg.borderColor,
                            borderWidth: 1,
                            borderStyle: 'solid',
                          }}
                        />
                      </TableCell>

                      {/* Actions */}
                      <TableCell align="right">
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => handleInspectConversation(conv)}
                            sx={{ fontSize: '0.75rem', fontWeight: 600, py: 0.5 }}
                          >
                            Inspect
                          </Button>
                          <Tooltip title="Trigger or retry deal analysis">
                            <span>
                              <IconButton
                                size="small"
                                disabled={isAnalyzing}
                                onClick={() => handleTriggerAnalysis(conv.id)}
                                sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1 }}
                              >
                                {isAnalyzing ? <CircularProgress size={14} /> : <ReplayIcon sx={{ fontSize: 16 }} />}
                              </IconButton>
                            </span>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>

      {/* 6. Conversation Deal Analysis Details Dialog */}
      {activeSession && (
        <Dialog
          open={detailModalOpen}
          onClose={() => setDetailModalOpen(false)}
          maxWidth="md"
          fullWidth
          PaperProps={{ sx: { borderRadius: 2.5 } }}
        >
          <DialogTitle sx={{ p: 2.5, pb: 1.5 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
              <Box>
                <Stack direction="row" alignItems="center" spacing={1.25} sx={{ mb: 0.5 }}>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    Deal Intelligence Analysis
                  </Typography>
                  <Chip
                    size="small"
                    icon={<AiIcon sx={{ fontSize: '12px !important', color: '#7C3AED !important' }} />}
                    label="AI Assessment"
                    sx={{
                      height: 20,
                      fontSize: '0.6875rem',
                      fontWeight: 700,
                      bgcolor: '#F5F3FF',
                      color: '#6D28D9',
                      borderColor: '#DDD6FE',
                      borderWidth: 1,
                      borderStyle: 'solid',
                    }}
                  />
                </Stack>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  Session ID: <strong style={{ fontFamily: 'monospace' }}>{activeSession.id || activeSession.sessionId}</strong> • {activeSession.storeName || activeSession.storeCode} • {activeSession.salesRep}
                </Typography>
              </Box>

              <IconButton size="small" onClick={() => setDetailModalOpen(false)}>
                <CloseIcon />
              </IconButton>
            </Stack>
          </DialogTitle>
          <Divider />

          <DialogContent sx={{ p: 3 }}>
            {/* View Toggle Tabs */}
            <Stack direction="row" spacing={1.5} sx={{ mb: 3 }}>
              <Button
                size="small"
                variant={activeTab === 'analysis' ? 'contained' : 'outlined'}
                onClick={() => setActiveTab('analysis')}
                startIcon={<AiIcon />}
                sx={{ fontWeight: 600, fontSize: '0.8125rem' }}
              >
                Deal Analysis
              </Button>
              <Button
                size="small"
                variant={activeTab === 'transcript' ? 'contained' : 'outlined'}
                onClick={() => setActiveTab('transcript')}
                startIcon={<QuestionIcon />}
                sx={{ fontWeight: 600, fontSize: '0.8125rem' }}
              >
                Full Transcript ({activeSession.transcripts?.length || 0} lines)
              </Button>
            </Stack>

            {activeTab === 'analysis' ? (
              <Stack spacing={2.5}>
                {/* A. Summary Alert Box */}
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2.5,
                    borderRadius: 2,
                    bgcolor: '#FAF5FF',
                    borderColor: '#DDD6FE',
                  }}
                >
                  <Stack direction="row" spacing={1.25} alignItems="flex-start">
                    <AiIcon sx={{ color: '#7C3AED', mt: 0.25, fontSize: 20 }} />
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#5B21B6', mb: 0.5 }}>
                        Executive Conversation Summary
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#4C1D95', lineHeight: 1.6 }}>
                        {activeSession.dealAnalysis?.summary || activeSession.summary || 'Summary unavailable.'}
                      </Typography>
                    </Box>
                  </Stack>
                </Paper>

                {/* B. Core Extracted Attributes */}
                <Grid container spacing={2}>
                  {/* Outcome */}
                  <Grid item xs={12} sm={6}>
                    <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.5, height: '100%' }}>
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                        CONVERSATION OUTCOME
                      </Typography>
                      <Box sx={{ mt: 1 }}>
                        <Chip
                          size="small"
                          label={activeSession.dealAnalysis?.conversationOutcome || 'Unclear'}
                          sx={{
                            fontWeight: 700,
                            ...(OUTCOME_CONFIG[activeSession.dealAnalysis?.conversationOutcome] || OUTCOME_CONFIG.Unclear),
                            borderWidth: 1,
                            borderStyle: 'solid',
                          }}
                        />
                      </Box>
                      <Typography variant="caption" sx={{ color: 'text.secondary', mt: 1, display: 'block' }}>
                        Distinguishes confirmed sales from general customer inquiries.
                      </Typography>
                    </Paper>
                  </Grid>

                  {/* Buying Intent */}
                  <Grid item xs={12} sm={6}>
                    <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.5, height: '100%' }}>
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                        CUSTOMER BUYING INTENT
                      </Typography>
                      <Box sx={{ mt: 1 }}>
                        <Chip
                          size="small"
                          label={`${activeSession.dealAnalysis?.customerBuyingIntent || 'Unclear'} Intent`}
                          sx={{
                            fontWeight: 700,
                            ...(INTENT_CONFIG[activeSession.dealAnalysis?.customerBuyingIntent] || INTENT_CONFIG.Unclear),
                            borderWidth: 1,
                            borderStyle: 'solid',
                          }}
                        />
                      </Box>
                      <Typography variant="caption" sx={{ color: 'text.secondary', mt: 1, display: 'block' }}>
                        Based on product comparisons, questions, and readiness signals.
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>

                {/* C. Requirements & Products Discussed */}
                <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 1.5 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                    Customer Requirements & Discussed Products
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                        Customer Requirements:
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 0.25, fontWeight: 500 }}>
                        {activeSession.dealAnalysis?.customerRequirements || 'Not mentioned'}
                      </Typography>
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                        Budget / Price Mentioned:
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 0.25, fontWeight: 600, color: 'secondary.main' }}>
                        {activeSession.dealAnalysis?.budgetAndPrice || 'Not mentioned'}
                      </Typography>
                    </Grid>

                    <Grid item xs={12}>
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                        Products / Models Identified:
                      </Typography>
                      <Stack direction="row" spacing={0.75} flexWrap="wrap" gap={0.5} sx={{ mt: 0.5 }}>
                        {(activeSession.dealAnalysis?.productsDiscussed || []).length > 0 ? (
                          activeSession.dealAnalysis.productsDiscussed.map((p, idx) => (
                            <Chip key={idx} size="small" label={p} sx={{ fontWeight: 600 }} />
                          ))
                        ) : (
                          <Typography variant="body2" sx={{ color: 'text.disabled' }}>
                            Not mentioned
                          </Typography>
                        )}
                      </Stack>
                    </Grid>
                  </Grid>
                </Paper>

                {/* D. Objections & Rep Response */}
                <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 1.5 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.25 }}>
                    Objections & Salesperson Response
                  </Typography>
                  <Stack spacing={1.5}>
                    <Box>
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                        Customer Hesitations / Objections:
                      </Typography>
                      <Stack direction="row" spacing={0.75} flexWrap="wrap" gap={0.5} sx={{ mt: 0.5 }}>
                        {(activeSession.dealAnalysis?.customerObjections || []).length > 0 ? (
                          activeSession.dealAnalysis.customerObjections.map((o, idx) => (
                            <Chip key={idx} size="small" label={o} color="error" variant="outlined" />
                          ))
                        ) : (
                          <Typography variant="body2" sx={{ color: 'text.disabled' }}>
                            No explicit customer objections recorded.
                          </Typography>
                        )}
                      </Stack>
                    </Box>

                    <Box>
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                        Salesperson's Response / Counter-Strategy:
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 0.25, lineHeight: 1.5 }}>
                        {activeSession.dealAnalysis?.salespersonResponse || 'Not mentioned'}
                      </Typography>
                    </Box>
                  </Stack>
                </Paper>

                {/* E. Next Recommended Action */}
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 1.5, bgcolor: '#F8FAFC' }}>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>
                    RECOMMENDED NEXT FOLLOW-UP ACTION
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 0.5, fontWeight: 600, color: 'text.primary' }}>
                    {activeSession.dealAnalysis?.nextRecommendedAction || 'No immediate follow-up required.'}
                  </Typography>
                </Paper>

                {/* F. Key Moments Excerpts */}
                {(activeSession.dealAnalysis?.keyMoments || []).length > 0 && (
                  <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 1.5 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
                      Supporting Transcript Excerpts
                    </Typography>
                    <Stack spacing={1.25}>
                      {activeSession.dealAnalysis.keyMoments.map((km, idx) => (
                        <Box key={idx} sx={{ p: 1.5, bgcolor: '#F8FAFC', borderRadius: 1 }}>
                          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                            <Typography variant="caption" sx={{ fontWeight: 700, color: 'secondary.main' }}>
                              {km.speaker || 'Speaker'}
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.6875rem' }}>
                              {km.significance}
                            </Typography>
                          </Stack>
                          <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.primary' }}>
                            "{km.excerpt}"
                          </Typography>
                        </Box>
                      ))}
                    </Stack>
                  </Paper>
                )}
              </Stack>
            ) : (
              /* Transcript Tab */
              <Box>
                {(!activeSession.transcripts || activeSession.transcripts.length === 0) ? (
                  <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center', py: 4 }}>
                    No recorded transcript dialogue for this session.
                  </Typography>
                ) : (
                  <Stack spacing={1.5}>
                    {activeSession.transcripts.map((t, idx) => {
                      const isSales = (t.speaker || '').toLowerCase().includes('sales');
                      return (
                        <Paper
                          key={idx}
                          variant="outlined"
                          sx={{
                            p: 1.75,
                            borderRadius: 1.5,
                            bgcolor: isSales ? '#F8FAFC' : '#FFFFFF',
                          }}
                        >
                          <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                            <Typography variant="caption" sx={{ fontWeight: 700, color: isSales ? 'secondary.main' : 'text.primary' }}>
                              {isSales ? 'Sales Specialist' : 'Customer'}
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'text.disabled', fontFamily: 'monospace' }}>
                              {t.timestamp ? new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : ''}
                            </Typography>
                          </Stack>
                          <Typography variant="body2" sx={{ color: 'text.primary' }}>
                            {t.englishText || t.text}
                          </Typography>
                        </Paper>
                      );
                    })}
                  </Stack>
                )}
              </Box>
            )}
          </DialogContent>
          <Divider />

          <DialogActions sx={{ p: 2, px: 3, justifyContent: 'space-between' }}>
            <Button
              size="small"
              startIcon={<ReplayIcon />}
              onClick={() => handleTriggerAnalysis(activeSession.id || activeSession.sessionId)}
              disabled={analyzingSessionId === (activeSession.id || activeSession.sessionId)}
            >
              {analyzingSessionId === (activeSession.id || activeSession.sessionId) ? 'Analyzing...' : 'Re-analyze Session'}
            </Button>
            <Button variant="contained" size="small" onClick={() => setDetailModalOpen(false)}>
              Close
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
}
