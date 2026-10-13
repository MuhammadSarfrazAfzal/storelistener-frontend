/**
 * Storelistener — Salesperson Performance & Quality Scorecards (Module 7)
 * File: src/components/performance/SalespersonPerformancePage.jsx
 *
 * Implements:
 * 1. Documented 8-dimension sales quality rubric evaluation grounded in transcripts
 * 2. Transparent 0-100 overall scores (excluding dimensions with insufficient evidence)
 * 3. Clear distinction between objective business metrics and AI coaching suggestions
 * 4. Salesperson leaderboard with sample size badges, dimension bars, and trends
 * 5. Deep-dive scorecard modal with exact transcript citations and suggested alternative phrasing
 * 6. Multi-dimensional filtering (Store, Date Range, Salesperson search)
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
  Tabs,
  Tab,
} from '@mui/material';
import {
  EmojiEvents as TrophyIcon,
  Star as StarIcon,
  Refresh as RefreshIcon,
  CheckCircle as SuccessIcon,
  Warning as WarningIcon,
  HelpOutline as UnknownIcon,
  TrendingUp as TrendUpIcon,
  TrendingDown as TrendDownIcon,
  TrendingFlat as TrendFlatIcon,
  School as CoachingIcon,
  Close as CloseIcon,
  InfoOutlined as InfoIcon,
  RecordVoiceOver as RepIcon,
  Storefront as StoreIcon,
  FormatQuote as QuoteIcon,
  Lightbulb as IdeaIcon,
  AssignmentTurnedIn as RubricIcon,
  ArrowForward as ArrowIcon,
  HourglassEmpty as PendingIcon,
} from '@mui/icons-material';

const BACKEND_URL = 'http://localhost:5000';

const DIMENSION_CONFIG = {
  greeting: { label: 'Greeting & Opening', max: 100 },
  understandingRequirements: { label: 'Understanding Requirements', max: 100 },
  productKnowledge: { label: 'Product Knowledge', max: 100 },
  responseToObjections: { label: 'Response to Objections', max: 100 },
  communicationClarity: { label: 'Communication Clarity', max: 100 },
  handlingConcerns: { label: 'Handling Concerns', max: 100 },
  closingAttempt: { label: 'Closing Attempt', max: 100 },
  followUpCommitment: { label: 'Follow-up Commitment', max: 100 },
};

export default function SalespersonPerformancePage({ currentUser, token, onNavigate }) {
  // Filters
  const [selectedStore, setSelectedStore] = useState('all');
  const [dateRange, setDateRange] = useState('all');
  const [searchRep, setSearchRep] = useState('');

  // Data states
  const [loading, setLoading] = useState(true);
  const [salespeople, setSalespeople] = useState([]);
  const [totalSessions, setTotalSessions] = useState(0);
  const [scoringRubric, setScoringRubric] = useState(null);
  const [error, setError] = useState(null);

  // Inspection states
  const [selectedRep, setSelectedRep] = useState(null);
  const [repDetailModalOpen, setRepDetailModalOpen] = useState(false);
  const [repDetailLoading, setRepDetailLoading] = useState(false);
  const [repDetailData, setRepDetailData] = useState(null);

  // Single conversation scorecard modal
  const [sessionModalOpen, setSessionModalOpen] = useState(false);
  const [sessionDetail, setSessionDetail] = useState(null);
  const [sessionEvaluating, setSessionEvaluating] = useState(false);

  // Rubric info dialog
  const [rubricInfoOpen, setRubricInfoOpen] = useState(false);

  const fetchOverview = async () => {
    setLoading(true);
    setError(null);
    try {
      const authToken = token || localStorage.getItem('storelistener_token');
      const params = new URLSearchParams();
      if (selectedStore !== 'all') params.append('store', selectedStore);
      if (dateRange !== 'all') params.append('dateRange', dateRange);
      if (searchRep.trim()) params.append('salesperson', searchRep.trim());

      const res = await fetch(`${BACKEND_URL}/api/scorecards/overview?${params.toString()}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
      });

      if (!res.ok) {
        if (res.status === 403) {
          throw new Error('Access denied: You do not have permissions to view this store.');
        }
        throw new Error(`Server returned HTTP ${res.status}`);
      }

      const data = await res.json();
      if (data.success) {
        setSalespeople(data.salespeople || []);
        setTotalSessions(data.totalSessionsEvaluated || 0);
        setScoringRubric(data.scoringRubric || null);
      } else {
        throw new Error(data.error || 'Failed to load scorecard data');
      }
    } catch (err) {
      console.error('Failed to load scorecard overview:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, [selectedStore, dateRange, searchRep]);

  const handleOpenRepDetail = async (rep) => {
    setSelectedRep(rep);
    setRepDetailModalOpen(true);
    setRepDetailLoading(true);
    try {
      const authToken = token || localStorage.getItem('storelistener_token');
      const res = await fetch(
        `${BACKEND_URL}/api/scorecards/salesperson/${encodeURIComponent(rep.name)}?store=${selectedStore}`,
        {
          headers: {
            'Content-Type': 'application/json',
            ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
          },
        }
      );
      const data = await res.json();
      if (data.success) {
        setRepDetailData(data);
      }
    } catch (err) {
      console.error('Failed to fetch salesperson details:', err);
    } finally {
      setRepDetailLoading(false);
    }
  };

  const handleOpenSessionScorecard = async (sessionId) => {
    try {
      const authToken = token || localStorage.getItem('storelistener_token');
      const res = await fetch(`${BACKEND_URL}/api/scorecards/session/${sessionId}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
      });
      const data = await res.json();
      if (data.success) {
        setSessionDetail(data);
        setSessionModalOpen(true);
      }
    } catch (err) {
      console.error('Failed to fetch session scorecard:', err);
    }
  };

  const handleReevaluateSession = async (sessionId) => {
    setSessionEvaluating(true);
    try {
      const authToken = token || localStorage.getItem('storelistener_token');
      const res = await fetch(`${BACKEND_URL}/api/scorecards/session/${sessionId}/evaluate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({ force: true }),
      });
      const data = await res.json();
      if (data.success) {
        setSessionDetail((prev) => ({
          ...prev,
          scorecard: data.scorecard,
        }));
        fetchOverview();
      }
    } catch (err) {
      console.error('Re-evaluation error:', err);
    } finally {
      setSessionEvaluating(false);
    }
  };

  // Helper for score color
  const getScoreColor = (score) => {
    if (score === null || score === undefined) return '#64748B';
    if (score >= 85) return '#15803D'; // Green
    if (score >= 70) return '#D97706'; // Amber
    return '#B91C1C'; // Red
  };

  const getScoreBg = (score) => {
    if (score === null || score === undefined) return '#F1F5F9';
    if (score >= 85) return '#F0FDF4';
    if (score >= 70) return '#FFFBEB';
    return '#FEF2F2';
  };

  // Network averages
  const eligibleReps = salespeople.filter((r) => r.overallScore !== null);
  const networkAvgScore =
    eligibleReps.length > 0
      ? Math.round(eligibleReps.reduce((a, b) => a + b.overallScore, 0) / eligibleReps.length)
      : null;
  const totalConfirmedSales = salespeople.reduce((a, b) => a + (b.confirmedSalesCount || 0), 0);
  const totalFollowUps = salespeople.reduce((a, b) => a + (b.followUpCount || 0), 0);

  return (
    <Box sx={{ maxWidth: 1440, mx: 'auto', p: { xs: 2, md: 3 } }}>
      {/* 1. Header & Navigation Shortcuts */}
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
              Salesperson Performance & Quality Scorecards
            </Typography>
            <Chip
              size="small"
              icon={<RubricIcon sx={{ fontSize: '14px !important', color: '#1E40AF !important' }} />}
              label="Module 7 Rubric"
              sx={{
                bgcolor: '#EFF6FF',
                color: '#1E40AF',
                borderColor: '#BFDBFE',
                borderWidth: 1,
                borderStyle: 'solid',
                fontWeight: 600,
                fontSize: '0.75rem',
              }}
            />
          </Stack>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
            Objective 8-dimension consultative sales quality evaluation strictly grounded in saved conversation transcripts.
          </Typography>
        </Box>

        <Stack direction="row" spacing={1.5}>
          <Button
            size="small"
            variant="outlined"
            startIcon={<InfoIcon />}
            onClick={() => setRubricInfoOpen(true)}
            sx={{ fontWeight: 600, fontSize: '0.8125rem' }}
          >
            Scoring Rubric
          </Button>
          <Button
            size="small"
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchOverview}
            disabled={loading}
            sx={{ fontWeight: 600, fontSize: '0.8125rem' }}
          >
            Refresh
          </Button>
        </Stack>
      </Stack>

      {/* 2. Transparent Scoring Disclaimer Banner */}
      <Alert
        severity="info"
        icon={<InfoIcon fontSize="small" />}
        sx={{
          mb: 3,
          borderRadius: 2,
          py: 0.75,
          px: 2,
          fontSize: '0.8125rem',
          bgcolor: '#F8FAFC',
          borderColor: '#E2E8F0',
          borderWidth: 1,
          borderStyle: 'solid',
          color: '#334155',
        }}
      >
        <strong>Transparent Evaluation & Grounding Notice: </strong>
        Overall scores (0–100) are calculated strictly as the mean of dimensions that have verifiable transcript evidence.
        If a dimension cannot be assessed (e.g. no objections occurred or immediate purchase occurred), it is classified as{' '}
        <em>"Insufficient evidence"</em> and <strong>never penalizes</strong> the representative. AI coaching feedback is strictly separated from verified business facts.
      </Alert>

      {/* 3. Filter Bar */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          mb: 3,
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel id="filter-store-label">Retail Store</InputLabel>
              <Select
                labelId="filter-store-label"
                id="filter-store"
                value={selectedStore}
                label="Retail Store"
                onChange={(e) => setSelectedStore(e.target.value)}
              >
                <MenuItem value="all">All Stores</MenuItem>
                <MenuItem value="store-01">iPhone Store 01 (5th Ave)</MenuItem>
                <MenuItem value="store-02">iPhone Store 02 (Beverly Hills)</MenuItem>
                <MenuItem value="store-03">iPhone Store 03 (Brickell)</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel id="filter-date-label">Date Range</InputLabel>
              <Select
                labelId="filter-date-label"
                id="filter-date"
                value={dateRange}
                label="Date Range"
                onChange={(e) => setDateRange(e.target.value)}
              >
                <MenuItem value="all">All Available</MenuItem>
                <MenuItem value="today">Today</MenuItem>
                <MenuItem value="7d">Last 7 Days</MenuItem>
                <MenuItem value="30d">Last 30 Days</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <TextField
              fullWidth
              size="small"
              label="Search Sales Specialist"
              id="search-rep"
              value={searchRep}
              onChange={(e) => setSearchRep(e.target.value)}
              placeholder="e.g. Alex Taylor, Jordan Lee..."
            />
          </Grid>

          <Grid item xs={12} sm={6} md={2}>
            <Button
              fullWidth
              size="small"
              variant="contained"
              onClick={fetchOverview}
              sx={{ height: 40, fontWeight: 600 }}
            >
              Apply Filter
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* 4. Top KPI Cards */}
      <Grid container spacing={2.5} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ p: 2.5, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Box>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase' }}>
                  Active Representatives
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 700, mt: 0.5 }}>
                  {salespeople.length}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  Assigned across retail branches
                </Typography>
              </Box>
              <RepIcon sx={{ fontSize: 36, color: 'primary.main', opacity: 0.8 }} />
            </Stack>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ p: 2.5, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Box>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase' }}>
                  Network Quality Average
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 700, mt: 0.5, color: getScoreColor(networkAvgScore) }}>
                  {networkAvgScore !== null ? `${networkAvgScore}/100` : 'N/A'}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  Across eligible conversations
                </Typography>
              </Box>
              <TrophyIcon sx={{ fontSize: 36, color: '#F59E0B', opacity: 0.8 }} />
            </Stack>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ p: 2.5, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Box>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase' }}>
                  Confirmed Sales
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 700, mt: 0.5, color: '#15803D' }}>
                  {totalConfirmedSales}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  Documented in saved transcripts
                </Typography>
              </Box>
              <SuccessIcon sx={{ fontSize: 36, color: '#16A34A', opacity: 0.8 }} />
            </Stack>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card elevation={0} sx={{ p: 2.5, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Box>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase' }}>
                  Follow-ups Committed
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 700, mt: 0.5, color: '#B45309' }}>
                  {totalFollowUps}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  Next step or contact scheduled
                </Typography>
              </Box>
              <PendingIcon sx={{ fontSize: 36, color: '#D97706', opacity: 0.8 }} />
            </Stack>
          </Card>
        </Grid>
      </Grid>

      {/* 5. Salesperson Scorecards Directory */}
      <Card elevation={0} sx={{ borderRadius: 2, border: '1px solid', borderColor: 'divider', mb: 4 }}>
        <CardHeader
          title={
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Salesperson Scorecards & Quality Breakdown
            </Typography>
          }
          subheader="Evaluated on 8 core dimensions. Click any representative to inspect conversation excerpts, strengths, and coaching suggestions."
          action={
            <Typography variant="caption" sx={{ color: 'text.secondary', pr: 2 }}>
              Total Sessions In Scope: <strong>{totalSessions}</strong>
            </Typography>
          }
        />
        <Divider />

        {loading ? (
          <Box sx={{ p: 6, textAlign: 'center' }}>
            <CircularProgress size={36} />
            <Typography variant="body2" sx={{ mt: 2, color: 'text.secondary' }}>
              Analyzing conversation scorecards and aggregating rubric dimensions...
            </Typography>
          </Box>
        ) : error ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Alert severity="error" sx={{ maxWidth: 600, mx: 'auto' }}>
              {error}
            </Alert>
          </Box>
        ) : salespeople.length === 0 ? (
          <Box sx={{ p: 6, textAlign: 'center' }}>
            <Typography variant="h6" sx={{ color: 'text.secondary', fontWeight: 600 }}>
              No salesperson conversations found matching active filters.
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.disabled', mt: 0.5 }}>
              Try adjusting your store or date range selection.
            </Typography>
          </Box>
        ) : (
          <TableContainer>
            <Table sx={{ minWidth: 950 }}>
              <TableHead sx={{ bgcolor: '#F8FAFC' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.8125rem' }}>Sales Specialist</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.8125rem' }}>Assigned Store</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.8125rem' }}>Eligible Sample Size</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.8125rem' }}>Overall Score</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.8125rem' }}>Confirmed Sales</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.8125rem' }}>Performance Trend</TableCell>
                  <TableCell sx={{ fontWeight: 700, fontSize: '0.8125rem' }}>Observed Strengths</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, fontSize: '0.8125rem' }}>Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {salespeople.map((rep) => {
                  const hasScore = rep.overallScore !== null;
                  return (
                    <TableRow key={rep.name} hover sx={{ '&:hover': { bgcolor: '#F8FAFC' } }}>
                      {/* Name & Rep icon */}
                      <TableCell>
                        <Stack direction="row" spacing={1.5} alignItems="center">
                          <Box
                            sx={{
                              width: 32,
                              height: 32,
                              borderRadius: '50%',
                              bgcolor: 'primary.light',
                              color: 'primary.contrastText',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: '0.875rem',
                            }}
                          >
                            {rep.name.charAt(0)}
                          </Box>
                          <Box>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                              {rep.name}
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                              {rep.totalConversations} total conversations
                            </Typography>
                          </Box>
                        </Stack>
                      </TableCell>

                      {/* Store */}
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {rep.storeName || rep.storeCode}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          {rep.storeCode}
                        </Typography>
                      </TableCell>

                      {/* Sample Size */}
                      <TableCell>
                        <Tooltip title={rep.sampleSizeNote} arrow>
                          <Chip
                            size="small"
                            label={`${rep.eligibleConversations} / ${rep.totalConversations} eligible`}
                            sx={{
                              fontWeight: 600,
                              fontSize: '0.75rem',
                              bgcolor: rep.eligibleConversations >= 2 ? '#EFF6FF' : '#F1F5F9',
                              color: rep.eligibleConversations >= 2 ? '#1D4ED8' : '#64748B',
                              borderColor: rep.eligibleConversations >= 2 ? '#BFDBFE' : '#CBD5E1',
                              borderWidth: 1,
                              borderStyle: 'solid',
                            }}
                          />
                        </Tooltip>
                      </TableCell>

                      {/* Overall Score */}
                      <TableCell>
                        {hasScore ? (
                          <Box sx={{ width: 110 }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                              <Typography variant="body2" sx={{ fontWeight: 700, color: getScoreColor(rep.overallScore) }}>
                                {rep.overallScore} / 100
                              </Typography>
                            </Stack>
                            <LinearProgress
                              variant="determinate"
                              value={rep.overallScore}
                              sx={{
                                height: 6,
                                borderRadius: 3,
                                mt: 0.5,
                                bgcolor: '#E2E8F0',
                                '& .MuiLinearProgress-bar': {
                                  bgcolor: getScoreColor(rep.overallScore),
                                  borderRadius: 3,
                                },
                              }}
                            />
                          </Box>
                        ) : (
                          <Chip
                            size="small"
                            label="Insufficient Evidence"
                            sx={{
                              fontSize: '0.6875rem',
                              fontWeight: 600,
                              bgcolor: '#F1F5F9',
                              color: '#64748B',
                            }}
                          />
                        )}
                      </TableCell>

                      {/* Confirmed Sales */}
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: '#15803D' }}>
                          {rep.confirmedSalesCount} sales
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          {rep.conversionRate}% conversion
                        </Typography>
                      </TableCell>

                      {/* Trend */}
                      <TableCell>
                        {rep.trend > 0 ? (
                          <Stack direction="row" alignItems="center" spacing={0.5} sx={{ color: '#15803D' }}>
                            <TrendUpIcon fontSize="small" />
                            <Typography variant="body2" sx={{ fontWeight: 700 }}>
                              +{rep.trend}%
                            </Typography>
                          </Stack>
                        ) : rep.trend < 0 ? (
                          <Stack direction="row" alignItems="center" spacing={0.5} sx={{ color: '#B91C1C' }}>
                            <TrendDownIcon fontSize="small" />
                            <Typography variant="body2" sx={{ fontWeight: 700 }}>
                              {rep.trend}%
                            </Typography>
                          </Stack>
                        ) : (
                          <Stack direction="row" alignItems="center" spacing={0.5} sx={{ color: '#64748B' }}>
                            <TrendFlatIcon fontSize="small" />
                            <Typography variant="caption">Steady</Typography>
                          </Stack>
                        )}
                      </TableCell>

                      {/* Observed Strengths */}
                      <TableCell sx={{ maxWidth: 220 }}>
                        {rep.topStrengths && rep.topStrengths.length > 0 ? (
                          <Typography
                            variant="caption"
                            sx={{
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                              color: 'text.secondary',
                            }}
                          >
                            ✓ {rep.topStrengths[0]}
                          </Typography>
                        ) : (
                          <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                            Assessing initial conversations...
                          </Typography>
                        )}
                      </TableCell>

                      {/* Action */}
                      <TableCell align="right">
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => handleOpenRepDetail(rep)}
                          sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.75rem' }}
                        >
                          View Scorecard
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>

      {/* 6. Detailed Salesperson Profile & Dimension Breakdown Modal */}
      <Dialog
        open={repDetailModalOpen}
        onClose={() => setRepDetailModalOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                {selectedRep?.name} — Quality Scorecard
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.25 }}>
                {selectedRep?.storeName} ({selectedRep?.storeCode}) • {selectedRep?.eligibleConversations} eligible conversation(s) evaluated
              </Typography>
            </Box>
            <IconButton onClick={() => setRepDetailModalOpen(false)} size="small">
              <CloseIcon />
            </IconButton>
          </Stack>
        </DialogTitle>
        <Divider />

        <DialogContent sx={{ pt: 2.5 }}>
          {repDetailLoading ? (
            <Box sx={{ p: 6, textAlign: 'center' }}>
              <CircularProgress size={32} />
              <Typography variant="body2" sx={{ mt: 2, color: 'text.secondary' }}>
                Loading conversation scorecards and transcript citations...
              </Typography>
            </Box>
          ) : (
            <Box>
              {/* Overall Score Summary Bar */}
              <Paper
                elevation={0}
                sx={{
                  p: 2.5,
                  mb: 3,
                  borderRadius: 2,
                  bgcolor: getScoreBg(selectedRep?.overallScore),
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} sm={4}>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase' }}>
                      Overall Quality Rating
                    </Typography>
                    <Typography variant="h3" sx={{ fontWeight: 800, color: getScoreColor(selectedRep?.overallScore), mt: 0.5 }}>
                      {selectedRep?.overallScore !== null ? `${selectedRep?.overallScore}/100` : 'N/A'}
                    </Typography>
                  </Grid>

                  <Grid item xs={12} sm={8}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      Documented Rubric Assessment
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.25 }}>
                      Calculated from {selectedRep?.eligibleConversations} conversation(s) where at least 2 dimensions had sufficient transcript evidence.
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#15803D', fontWeight: 600, display: 'block', mt: 0.5 }}>
                      ✓ Confirmed Sales: {selectedRep?.confirmedSalesCount} • Follow-ups Committed: {selectedRep?.followUpCount}
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>

              {/* 8-Dimension Quality Breakdown Grid */}
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
                8-Dimension Quality Evaluation
              </Typography>

              <Grid container spacing={2} sx={{ mb: 3 }}>
                {Object.entries(DIMENSION_CONFIG).map(([key, config]) => {
                  const score = selectedRep?.dimensionAverages?.[key];
                  const hasEvidence = score !== null && score !== undefined;

                  return (
                    <Grid item xs={12} sm={6} key={key}>
                      <Card elevation={0} sx={{ p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider', height: '100%' }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>
                            {config.label}
                          </Typography>
                          {hasEvidence ? (
                            <Chip
                              size="small"
                              label={`${score}/100`}
                              sx={{
                                fontWeight: 700,
                                fontSize: '0.75rem',
                                bgcolor: getScoreBg(score),
                                color: getScoreColor(score),
                              }}
                            />
                          ) : (
                            <Chip
                              size="small"
                              label="Insufficient Evidence"
                              sx={{
                                fontSize: '0.625rem',
                                fontWeight: 600,
                                bgcolor: '#F1F5F9',
                                color: '#64748B',
                              }}
                            />
                          )}
                        </Stack>

                        {hasEvidence ? (
                          <LinearProgress
                            variant="determinate"
                            value={score}
                            sx={{
                              height: 5,
                              borderRadius: 2.5,
                              mt: 1.5,
                              bgcolor: '#E2E8F0',
                              '& .MuiLinearProgress-bar': {
                                bgcolor: getScoreColor(score),
                                borderRadius: 2.5,
                              },
                            }}
                          />
                        ) : (
                          <Typography variant="caption" sx={{ color: 'text.disabled', display: 'block', mt: 1 }}>
                            Not observed or not applicable in tested dialogue. Excluded from score denominator.
                          </Typography>
                        )}
                      </Card>
                    </Grid>
                  );
                })}
              </Grid>

              {/* Actionable Coaching Suggestions */}
              <Paper elevation={0} sx={{ p: 2.5, borderRadius: 2, bgcolor: '#F8FAFC', border: '1px solid', borderColor: 'divider', mb: 3 }}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
                  <CoachingIcon sx={{ color: 'primary.main', fontSize: 20 }} />
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                    Actionable Conversation Coaching
                  </Typography>
                  <Chip size="small" label="AI Recommendation" sx={{ height: 18, fontSize: '0.625rem', fontWeight: 600 }} />
                </Stack>

                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: '#15803D', display: 'block', mb: 0.5 }}>
                      ✓ Handled Well (Observed Strengths):
                    </Typography>
                    {selectedRep?.topStrengths && selectedRep.topStrengths.length > 0 ? (
                      selectedRep.topStrengths.map((str, idx) => (
                        <Typography key={idx} variant="body2" sx={{ color: 'text.secondary', fontSize: '0.8125rem', mb: 0.5 }}>
                          • {str}
                        </Typography>
                      ))
                    ) : (
                      <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                        Polite customer consultation observed.
                      </Typography>
                    )}
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: '#D97706', display: 'block', mb: 0.5 }}>
                      ⚡ Coaching Opportunity (Areas for Improvement):
                    </Typography>
                    {selectedRep?.topImprovementAreas && selectedRep.topImprovementAreas.length > 0 ? (
                      selectedRep.topImprovementAreas.map((imp, idx) => (
                        <Typography key={idx} variant="body2" sx={{ color: 'text.secondary', fontSize: '0.8125rem', mb: 0.5 }}>
                          • {imp}
                        </Typography>
                      ))
                    ) : (
                      <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                        Maintain active listening and consistent product recommendations.
                      </Typography>
                    )}
                  </Grid>
                </Grid>
              </Paper>

              {/* Evaluated Conversations Table */}
              <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
                Conversation History & Individual Scorecards
              </Typography>

              {repDetailData?.conversations && repDetailData.conversations.length > 0 ? (
                <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                  <Table size="small">
                    <TableHead sx={{ bgcolor: '#F8FAFC' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700 }}>Session</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Outcome</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Score</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>Inspect</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {repDetailData.conversations.map((conv) => (
                        <TableRow key={conv.sessionId} hover>
                          <TableCell sx={{ fontWeight: 600 }}>{conv.sessionId}</TableCell>
                          <TableCell sx={{ color: 'text.secondary' }}>
                            {conv.startedAt ? new Date(conv.startedAt).toLocaleDateString() : 'N/A'}
                          </TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              label={conv.outcome}
                              sx={{
                                height: 20,
                                fontSize: '0.6875rem',
                                fontWeight: 600,
                                bgcolor:
                                  conv.outcome === 'Sale Confirmed'
                                    ? '#F0FDF4'
                                    : conv.outcome === 'Follow-up Required'
                                    ? '#FFFBEB'
                                    : '#F1F5F9',
                                color:
                                  conv.outcome === 'Sale Confirmed'
                                    ? '#15803D'
                                    : conv.outcome === 'Follow-up Required'
                                    ? '#B45309'
                                    : '#64748B',
                              }}
                            />
                          </TableCell>
                          <TableCell sx={{ fontWeight: 700, color: getScoreColor(conv.scorecard?.overallScore) }}>
                            {conv.scorecard?.overallScore !== null ? `${conv.scorecard?.overallScore}/100` : 'Insufficient Evidence'}
                          </TableCell>
                          <TableCell align="right">
                            <Button
                              size="small"
                              onClick={() => handleOpenSessionScorecard(conv.sessionId)}
                              sx={{ fontSize: '0.75rem', fontWeight: 600 }}
                            >
                              Details
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  No saved conversations recorded yet.
                </Typography>
              )}
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setRepDetailModalOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* 7. Single Conversation Scorecard Inspection Modal */}
      <Dialog
        open={sessionModalOpen}
        onClose={() => setSessionModalOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Conversation Scorecard — {sessionDetail?.session?.sessionId}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Sales Rep: <strong>{sessionDetail?.session?.salesRep}</strong> • Store: {sessionDetail?.session?.storeCode}
              </Typography>
            </Box>
            <IconButton onClick={() => setSessionModalOpen(false)} size="small">
              <CloseIcon />
            </IconButton>
          </Stack>
        </DialogTitle>
        <Divider />

        <DialogContent sx={{ pt: 2 }}>
          {sessionDetail && (
            <Box>
              {/* Score header */}
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  mb: 2.5,
                  borderRadius: 2,
                  bgcolor: getScoreBg(sessionDetail.scorecard?.overallScore),
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase' }}>
                      Overall Conversation Score
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 800, color: getScoreColor(sessionDetail.scorecard?.overallScore), mt: 0.25 }}>
                      {sessionDetail.scorecard?.overallScore !== null ? `${sessionDetail.scorecard?.overallScore} / 100` : 'Insufficient Evidence'}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {sessionDetail.scorecard?.evaluationNotes || 'Calculated strictly from evaluable transcript dimensions.'}
                    </Typography>
                  </Box>

                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={sessionEvaluating ? <CircularProgress size={14} /> : <RefreshIcon />}
                    onClick={() => handleReevaluateSession(sessionDetail.session.sessionId)}
                    disabled={sessionEvaluating}
                    sx={{ textTransform: 'none', fontWeight: 600 }}
                  >
                    Re-evaluate
                  </Button>
                </Stack>
              </Paper>

              {/* Actionable coaching recommendation */}
              {sessionDetail.scorecard?.coachingFeedback?.suggestedAlternative && (
                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    mb: 2.5,
                    borderRadius: 2,
                    bgcolor: '#EFF6FF',
                    border: '1px solid #BFDBFE',
                  }}
                >
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                    <IdeaIcon sx={{ color: '#1D4ED8', fontSize: 18 }} />
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#1E40AF' }}>
                      Suggested Alternative Response for Opportunity:
                    </Typography>
                  </Stack>
                  <Typography variant="body2" sx={{ color: '#1E3A8A', fontStyle: 'italic', pl: 1, borderLeft: '3px solid #3B82F6' }}>
                    {sessionDetail.scorecard.coachingFeedback.suggestedAlternative}
                  </Typography>
                </Paper>
              )}

              {/* Dimension Excerpts */}
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                Dimension Citations & Transcript Excerpts
              </Typography>

              {sessionDetail.scorecard?.dimensions && (
                <Stack spacing={1.5}>
                  {Object.entries(sessionDetail.scorecard.dimensions).map(([key, dim]) => (
                    <Card key={key} elevation={0} sx={{ p: 1.5, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                          {DIMENSION_CONFIG[key]?.label || key}
                        </Typography>
                        {dim.sufficientEvidence ? (
                          <Chip
                            size="small"
                            label={`${dim.score} / 100`}
                            sx={{
                              height: 20,
                              fontWeight: 700,
                              fontSize: '0.6875rem',
                              bgcolor: getScoreBg(dim.score),
                              color: getScoreColor(dim.score),
                            }}
                          />
                        ) : (
                          <Chip
                            size="small"
                            label="Insufficient Evidence"
                            sx={{ height: 20, fontSize: '0.625rem', bgcolor: '#F1F5F9', color: '#64748B' }}
                          />
                        )}
                      </Stack>
                      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                        {dim.explanation}
                      </Typography>
                      {dim.evidenceExcerpt && (
                        <Typography
                          variant="caption"
                          sx={{
                            display: 'block',
                            mt: 0.5,
                            p: 0.75,
                            bgcolor: '#F8FAFC',
                            borderRadius: 1,
                            fontFamily: 'monospace',
                            color: '#334155',
                          }}
                        >
                          "{dim.evidenceExcerpt}"
                        </Typography>
                      )}
                    </Card>
                  ))}
                </Stack>
              )}
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setSessionModalOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* 8. Scoring Rubric Transparency Dialog */}
      <Dialog
        open={rubricInfoOpen}
        onClose={() => setRubricInfoOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Module 7 — Transparent Scoring Rubric
          </Typography>
        </DialogTitle>
        <Divider />
        <DialogContent>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
            The Storelistener quality rubric evaluates sales representatives across 8 key dimensions. All ratings are directly anchored to saved customer audio transcripts.
          </Typography>

          <Stack spacing={1.5} sx={{ mb: 2 }}>
            {Object.entries(DIMENSION_CONFIG).map(([k, cfg]) => (
              <Box key={k} sx={{ p: 1, bgcolor: '#F8FAFC', borderRadius: 1.5, border: '1px solid #E2E8F0' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  {cfg.label}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {scoringRubric?.dimensions?.[k]?.description || 'Evaluated based on transcript evidence.'}
                </Typography>
              </Box>
            ))}
          </Stack>

          <Alert severity="warning" sx={{ fontSize: '0.75rem' }}>
            <strong>Safety & Fairness Principle:</strong> Dimensions that cannot be assessed due to lack of customer dialogue (e.g., no objection was voiced) are classified as "Insufficient evidence" and are excluded from the score denominator, preventing unfair penalties.
          </Alert>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setRubricInfoOpen(false)}>Understood</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
