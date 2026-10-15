/**
 * Storelistener — Daily Reports & AI Analysis Dashboard
 * File: src/components/reports/DailyReportsPage.jsx
 *
 * Implements:
 * 1. Initial clean/blank state showing only title, calendar date filter, and AI Analysis button.
 * 2. On-demand AI Analysis execution fetching real conversations and verified revenue.
 * 3. Daily Performance Headline card with transparent activity levels (Quiet, Moderate, Active).
 * 4. Five compact KPI cards: Revenue, Conversations, Avg. Ticket, Missed, Low Stock.
 * 5. AI Summary & Key Points + Customer Sentiment progress + Actions for Tomorrow.
 * 6. Conversation Index table with word counts, real audio playback (▶), and transcript modal.
 * 7. Interactions & Coaching notes with specific observations and actionable feedback.
 * 8. Publication-grade PDF export adhering to executive standards.
 */

import React, { useState, useRef } from 'react';
import {
  Box,
  Typography,
  Grid,
  Stack,
  Card,
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
  TextField,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
  Divider,
  Alert,
  LinearProgress,
} from '@mui/material';
import {
  AutoAwesome as AiIcon,
  CalendarMonth as CalendarIcon,
  Download as ExportIcon,
  Refresh as RefreshIcon,
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  Shield as ShieldIcon,
  AttachMoney as MoneyIcon,
  Forum as ForumIcon,
  ReceiptLong as ReceiptIcon,
  TrendingDown as MissedIcon,
  Inventory2 as InventoryIcon,
  Bolt as LightningIcon,
  Favorite as HeartIcon,
  CheckCircleOutline as TargetIcon,
  Visibility as ViewIcon,
  Close as CloseIcon,
  Storefront as StoreIcon,
  ErrorOutline as ErrorIcon,
  GraphicEq as WaveIcon,
} from '@mui/icons-material';

import { BACKEND_URL } from '../../config/api';
import { downloadDailyReportPDF } from '../../utils/pdfReportService';

// Format YYYY-MM-DD from Date in local timezone
function formatLocalDate(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Pretty formatted business date string
function formatDisplayDate(dateStr) {
  if (!dateStr) return 'Selected Date';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      return d.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
    }
  } catch (e) {
    // Fallback
  }
  return dateStr;
}

export default function DailyReportsPage({ currentUser, token, socket, onNavigate }) {
  // Calendar filter state (defaults to today)
  const todayStr = formatLocalDate(new Date());
  const [selectedDate, setSelectedDate] = useState(todayStr);

  // Analysis report state (initially null for clean/blank state)
  const [reportData, setReportData] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [hasRunAnalysis, setHasRunAnalysis] = useState(false);

  // Audio playback state
  const [playingSessionId, setPlayingSessionId] = useState(null);
  const audioPlayerRef = useRef(null);

  // Transcript view modal state
  const [transcriptModalOpen, setTranscriptModalOpen] = useState(false);
  const [activeTranscriptSession, setActiveTranscriptSession] = useState(null);

  // Check if selected date is today (business day in progress)
  const isSelectedDateToday = selectedDate === todayStr;

  /**
   * Run AI Analysis for the selected date
   */
  const handleRunAiAnalysis = async (isRegenerate = false) => {
    if (!selectedDate) {
      setErrorMessage('Please choose a valid calendar date.');
      return;
    }

    setIsAnalyzing(true);
    setErrorMessage(null);

    try {
      const params = new URLSearchParams({
        filterType: 'single',
        date: selectedDate,
      });

      if (isRegenerate) {
        params.append('refresh', 'true');
      }

      const res = await fetch(`${BACKEND_URL}/api/reports/daily?${params.toString()}`, {
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}: Failed to generate analysis.`);
      }

      const data = await res.json();
      if (!data.success && data.error) {
        throw new Error(data.error);
      }

      const report = data.report || data;
      setReportData(report);
      setHasRunAnalysis(true);
    } catch (err) {
      console.error('[DailyReportsPage] Analysis error:', err);
      setErrorMessage(err.message || 'Failed to complete AI analysis. Please check server connectivity.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  /**
   * Handle Audio playback for a conversation
   */
  const handleToggleAudio = (session) => {
    if (!session.audioUrl && !session.audioFileName) return;

    if (playingSessionId === session.sessionId) {
      // Pause
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
      setPlayingSessionId(null);
    } else {
      // Play
      const rawUrl = session.audioUrl || `/uploads/${session.audioFileName}`;
      const fullUrl = rawUrl.startsWith('http') ? rawUrl : `${BACKEND_URL}${rawUrl.startsWith('/') ? '' : '/'}${rawUrl}`;

      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }

      const audio = new Audio(fullUrl);
      audioPlayerRef.current = audio;
      setPlayingSessionId(session.sessionId);

      audio.play().catch((playErr) => {
        console.warn('[Audio Playback] Error playing audio:', playErr);
        setPlayingSessionId(null);
      });

      audio.onended = () => {
        setPlayingSessionId(null);
      };
      audio.onerror = () => {
        console.warn('[Audio Playback] Audio element reported error');
        setPlayingSessionId(null);
      };
    }
  };

  /**
   * Export PDF for the currently generated report
   */
  const handleExportPdf = () => {
    if (!reportData) return;
    try {
      downloadDailyReportPDF({
        reportData,
        currentUser,
      });
    } catch (err) {
      console.error('[DailyReportsPage] PDF download error:', err);
    }
  };

  // Metrics derived from reportData
  const metrics = reportData?.metrics || {};
  const totalConversations = metrics.totalCompleted || 0;
  const verifiedSalesCount = metrics.verifiedSalesCount || 0;
  const verifiedRevenue = metrics.verifiedRevenue;
  const revenueDisplay = metrics.verifiedRevenueDisplay || (verifiedRevenue != null ? `$${verifiedRevenue}` : '$0');
  const avgTicketDisplay = metrics.avgTicketDisplay || 'N/A';
  const missedDisplay = metrics.missedRevenueDisplay || '$0';
  const lowStockDisplay = metrics.lowStockDisplay || '0';

  // Headline & Activity
  const activityLevel = metrics.activityLevel || (totalConversations >= 6 || verifiedSalesCount >= 2 ? 'Active' : totalConversations >= 2 ? 'Moderate' : 'Quiet');
  const headline = metrics.headline || (
    verifiedRevenue != null && verifiedRevenue > 0
      ? `${activityLevel} day, $${verifiedRevenue} in sales, ${totalConversations} conversation${totalConversations === 1 ? '' : 's'}`
      : `${activityLevel} day — no sales, ${totalConversations} conversation${totalConversations === 1 ? '' : 's'}`
  );
  const headlineExplanation = metrics.headlineExplanation || (
    totalConversations === 0
      ? 'Quiet day — no conversations recorded and no verified sales.'
      : `${activityLevel} day with ${totalConversations} recorded customer consultation${totalConversations > 1 ? 's' : ''} across store counters. ${verifiedSalesCount > 0 ? `Confirmed ${verifiedSalesCount} verified sales transaction${verifiedSalesCount > 1 ? 's' : ''} generating ${revenueDisplay}.` : 'No confirmed customer transactions recorded for this business date.'}`
  );

  const aiSummary = reportData?.aiSummary || {};
  const conversations = reportData?.conversations || [];

  // Sentiment counts
  const sentimentCounts = { POSITIVE: 0, NEUTRAL: 0, NEGATIVE: 0 };
  conversations.forEach((c) => {
    const s = (c.sentiment || 'NEUTRAL').toUpperCase();
    if (sentimentCounts[s] !== undefined) sentimentCounts[s]++;
    else sentimentCounts.NEUTRAL++;
  });
  const dominantSentiment = sentimentCounts.POSITIVE > sentimentCounts.NEGATIVE && sentimentCounts.POSITIVE > sentimentCounts.NEUTRAL
    ? 'POSITIVE'
    : sentimentCounts.NEGATIVE > sentimentCounts.POSITIVE && sentimentCounts.NEGATIVE > sentimentCounts.NEUTRAL
    ? 'NEGATIVE'
    : 'NEUTRAL';
  const dominantPercentage = totalConversations > 0 ? Math.round((sentimentCounts[dominantSentiment] / totalConversations) * 100) : 0;

  // Key points from AI Summary
  const keyPoints = [
    aiSummary.salesOutcomesSummary,
    ...(aiSummary.recurringObjections || []).map((o) => `Recurring customer note: ${o}`),
    ...(aiSummary.salespersonStrengths || []).map((s) => `Staff execution: ${s}`),
    ...(aiSummary.areasForImprovement || []).map((a) => `Improvement focus: ${a}`),
  ].filter(Boolean).slice(0, 4);

  // Recommendations
  const actionsTomorrow = (aiSummary.actionableRecommendations && aiSummary.actionableRecommendations.length > 0)
    ? aiSummary.actionableRecommendations.slice(0, 3)
    : [
        'Ensure staff maintain a welcoming tone and actively discover model preferences.',
        'Address trade-in valuation and 0% financing incentives early in discussions.',
        'Log all confirmed POS receipt transactions for verified revenue matching.',
      ];

  return (
    <Box sx={{ width: '100%', pb: 6 }}>
      {/* 1. Header Bar: Title, Subtitle, Date Picker, AI Analysis Button */}
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        alignItems={{ xs: 'flex-start', md: 'center' }}
        justifyContent="space-between"
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary', letterSpacing: '-0.02em' }}>
            Daily Reports
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
            Review daily sales conversation performance.
          </Typography>
        </Box>

        {/* Action Controls: Calendar Date Picker & AI Analysis Trigger */}
        <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
          <TextField
            type="date"
            size="small"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            disabled={isAnalyzing}
            sx={{
              width: 170,
              bgcolor: 'background.paper',
              borderRadius: 1.5,
              '& .MuiInputBase-input': {
                fontSize: '0.875rem',
                py: 1,
              },
            }}
          />

          <Button
            variant="contained"
            color="primary"
            disabled={isAnalyzing || !selectedDate}
            onClick={() => handleRunAiAnalysis(hasRunAnalysis && isSelectedDateToday)}
            startIcon={isAnalyzing ? <CircularProgress size={16} color="inherit" /> : <AiIcon />}
            sx={{
              fontWeight: 600,
              textTransform: 'none',
              px: 2.25,
              py: 1,
              borderRadius: 1.5,
              bgcolor: '#0F172A',
              '&:hover': { bgcolor: '#1E293B' },
              boxShadow: '0 2px 4px rgba(0,0,0,0.08)',
            }}
          >
            {isAnalyzing
              ? 'Analyzing...'
              : hasRunAnalysis && isSelectedDateToday
              ? 'Update Analysis'
              : hasRunAnalysis
              ? 'Re-run Analysis'
              : 'AI Analysis'}
          </Button>

          {hasRunAnalysis && reportData && (
            <Button
              variant="outlined"
              size="medium"
              startIcon={<ExportIcon />}
              onClick={handleExportPdf}
              sx={{
                fontWeight: 600,
                textTransform: 'none',
                borderRadius: 1.5,
                borderColor: '#CBD5E1',
                color: 'text.primary',
                bgcolor: 'background.paper',
              }}
            >
              Export PDF
            </Button>
          )}
        </Stack>
      </Stack>

      {/* Error Alert if analysis failed */}
      {errorMessage && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setErrorMessage(null)}>
          {errorMessage}
        </Alert>
      )}

      {/* Loading Progress State */}
      {isAnalyzing && (
        <Card sx={{ p: 4, mb: 3, textAlign: 'center', borderRadius: 2.5, border: '1px solid #E2E8F0' }}>
          <Stack spacing={2} alignItems="center" sx={{ maxWidth: 460, mx: 'auto' }}>
            <CircularProgress size={42} sx={{ color: '#2563EB' }} />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Synthesizing Daily AI Intelligence
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              Fetching real conversation transcripts, extracting customer intent, verifying sales outcomes, and computing coaching scorecards for {formatDisplayDate(selectedDate)}...
            </Typography>
            <LinearProgress sx={{ width: '100%', height: 6, borderRadius: 3 }} />
          </Stack>
        </Card>
      )}

      {/* 2. Initial State: Clean & Mostly Blank (Before User Clicks AI Analysis) */}
      {!hasRunAnalysis && !isAnalyzing && (
        <Card
          sx={{
            p: 6,
            textAlign: 'center',
            borderRadius: 3,
            border: '1px dashed #CBD5E1',
            bgcolor: '#F8FAFC',
          }}
        >
          <Box
            sx={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              bgcolor: '#EFF6FF',
              color: '#2563EB',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              mb: 2,
            }}
          >
            <CalendarIcon sx={{ fontSize: 32 }} />
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary', mb: 1 }}>
            Ready for Daily Intelligence Analysis
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 480, mx: 'auto', mb: 3, lineHeight: 1.6 }}>
            Select a date using the calendar above and click <strong>AI Analysis</strong> to evaluate daily sales conversations, verified revenue, customer sentiment, and agent coaching scorecards.
          </Typography>
          <Button
            variant="contained"
            startIcon={<AiIcon />}
            onClick={() => handleRunAiAnalysis(false)}
            sx={{
              fontWeight: 600,
              textTransform: 'none',
              px: 3,
              py: 1.2,
              borderRadius: 2,
              bgcolor: '#0F172A',
              '&:hover': { bgcolor: '#1E293B' },
            }}
          >
            Generate AI Analysis for {formatDisplayDate(selectedDate)}
          </Button>
        </Card>
      )}

      {/* 3. Generated Report View */}
      {hasRunAnalysis && !isAnalyzing && reportData && (
        <Stack spacing={3}>
          {/* A. Daily Performance Headline Card (Screenshot 5) */}
          <Card
            sx={{
              p: 3,
              borderRadius: 2.5,
              bgcolor: '#0F172A',
              color: '#FFFFFF',
              boxShadow: '0 4px 12px rgba(15,23,42,0.15)',
            }}
          >
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
              <ShieldIcon sx={{ fontSize: 18, color: '#38BDF8' }} />
              <Typography variant="caption" sx={{ fontWeight: 700, letterSpacing: '0.08em', color: '#94A3B8' }}>
                STORE LISTENER
              </Typography>
              <Chip
                size="small"
                label={activityLevel}
                sx={{
                  height: 20,
                  fontSize: '0.6875rem',
                  fontWeight: 700,
                  bgcolor: activityLevel === 'Active' ? '#166534' : activityLevel === 'Moderate' ? '#854D0E' : '#334155',
                  color: '#F8FAFC',
                }}
              />
            </Stack>

            <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '-0.02em', mb: 1.5, color: '#F8FAFC' }}>
              {headline}
            </Typography>

            <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" sx={{ mb: 2 }}>
              <Stack direction="row" spacing={0.75} alignItems="center">
                <StoreIcon sx={{ fontSize: 16, color: '#94A3B8' }} />
                <Typography variant="caption" sx={{ color: '#CBD5E1' }}>
                  {reportData.activeFilters?.store === 'all' || !reportData.activeFilters?.store ? 'All Stores' : reportData.activeFilters.store}
                </Typography>
              </Stack>
              <Typography variant="caption" sx={{ color: '#64748B' }}>•</Typography>
              <Stack direction="row" spacing={0.75} alignItems="center">
                <CalendarIcon sx={{ fontSize: 16, color: '#94A3B8' }} />
                <Typography variant="caption" sx={{ color: '#CBD5E1' }}>
                  {formatDisplayDate(selectedDate)}
                </Typography>
              </Stack>
              <Typography variant="caption" sx={{ color: '#64748B' }}>•</Typography>
              <Typography variant="caption" sx={{ color: '#94A3B8' }}>
                Generated {new Date(reportData.generatedAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })} • {totalConversations} conversation{totalConversations === 1 ? '' : 's'}
              </Typography>
            </Stack>

            <Typography variant="body2" sx={{ color: '#CBD5E1', maxWidth: 840, lineHeight: 1.6 }}>
              {headlineExplanation}
            </Typography>
          </Card>

          {/* B. 5 Compact KPI Cards (Screenshot 5) */}
          <Grid container spacing={2}>
            {/* 1. REVENUE */}
            <Grid item xs={6} sm={4} md={2.4}>
              <Card sx={{ p: 2, borderRadius: 2, border: '1px solid #E2E8F0', bgcolor: 'background.paper', height: '100%' }}>
                <Box sx={{ width: 32, height: 32, borderRadius: 1.5, bgcolor: '#DCFCE7', color: '#16A34A', display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
                  <MoneyIcon sx={{ fontSize: 18 }} />
                </Box>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Revenue
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary', mt: 0.5 }}>
                  {revenueDisplay}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}>
                  {verifiedSalesCount} item(s) sold
                </Typography>
              </Card>
            </Grid>

            {/* 2. CONVERSATIONS */}
            <Grid item xs={6} sm={4} md={2.4}>
              <Card sx={{ p: 2, borderRadius: 2, border: '1px solid #E2E8F0', bgcolor: 'background.paper', height: '100%' }}>
                <Box sx={{ width: 32, height: 32, borderRadius: 1.5, bgcolor: '#DBEAFE', color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
                  <ForumIcon sx={{ fontSize: 18 }} />
                </Box>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Conversations
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary', mt: 0.5 }}>
                  {totalConversations}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}>
                  {totalConversations} customer interaction{totalConversations === 1 ? '' : 's'}
                </Typography>
              </Card>
            </Grid>

            {/* 3. AVG TICKET */}
            <Grid item xs={6} sm={4} md={2.4}>
              <Card sx={{ p: 2, borderRadius: 2, border: '1px solid #E2E8F0', bgcolor: 'background.paper', height: '100%' }}>
                <Box sx={{ width: 32, height: 32, borderRadius: 1.5, bgcolor: '#F3E8FF', color: '#9333EA', display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
                  <ReceiptIcon sx={{ fontSize: 18 }} />
                </Box>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Avg. Ticket
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary', mt: 0.5 }}>
                  {avgTicketDisplay}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}>
                  per verified sale
                </Typography>
              </Card>
            </Grid>

            {/* 4. MISSED */}
            <Grid item xs={6} sm={4} md={2.4}>
              <Card sx={{ p: 2, borderRadius: 2, border: '1px solid #E2E8F0', bgcolor: 'background.paper', height: '100%' }}>
                <Box sx={{ width: 32, height: 32, borderRadius: 1.5, bgcolor: '#FEE2E2', color: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
                  <MissedIcon sx={{ fontSize: 18 }} />
                </Box>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Missed
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary', mt: 0.5 }}>
                  {missedDisplay}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}>
                  unconverted dialogue
                </Typography>
              </Card>
            </Grid>

            {/* 5. LOW STOCK */}
            <Grid item xs={6} sm={4} md={2.4}>
              <Card sx={{ p: 2, borderRadius: 2, border: '1px solid #E2E8F0', bgcolor: 'background.paper', height: '100%' }}>
                <Box sx={{ width: 32, height: 32, borderRadius: 1.5, bgcolor: '#FEF3C7', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
                  <InventoryIcon sx={{ fontSize: 18 }} />
                </Box>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Low Stock
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary', mt: 0.5 }}>
                  {lowStockDisplay}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}>
                  all stocked
                </Typography>
              </Card>
            </Grid>
          </Grid>

          {/* Empty Conversation Case: Honest Empty State */}
          {totalConversations === 0 && (
            <Card sx={{ p: 4, textAlign: 'center', borderRadius: 2.5, border: '1px solid #E2E8F0' }}>
              <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary', mb: 1 }}>
                Quiet day — no conversations recorded and no verified sales.
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', maxWidth: 480, mx: 'auto' }}>
                There were no completed audio conversations or confirmed transactions recorded for {formatDisplayDate(selectedDate)}.
              </Typography>
            </Card>
          )}

          {/* C. AI Summary & Key Points + Sentiment & Actions for Tomorrow (Screenshots 3 & 4) */}
          {totalConversations > 0 && (
            <Grid container spacing={3}>
              {/* Left Column: Summary & Key Points */}
              <Grid item xs={12} md={7}>
                <Card sx={{ p: 3, borderRadius: 2.5, border: '1px solid #E2E8F0', height: '100%' }}>
                  <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
                    <Box sx={{ width: 28, height: 28, borderRadius: 1, bgcolor: '#EFF6FF', color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <LightningIcon sx={{ fontSize: 18 }} />
                    </Box>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      Summary & Key Points
                    </Typography>
                  </Stack>

                  <Typography variant="body1" sx={{ color: 'text.secondary', lineHeight: 1.7, mb: 3 }}>
                    Today the store saw <strong>{totalConversations} customer(s)</strong>. The total verified revenue reached <strong>{revenueDisplay}</strong> across <strong>{verifiedSalesCount} confirmed sale(s)</strong>. Counter staff engagement was predominantly <strong>{dominantSentiment.toLowerCase()}</strong>.
                  </Typography>

                  <Stack spacing={1.5}>
                    {keyPoints.map((point, idx) => (
                      <Box
                        key={idx}
                        sx={{
                          p: 2,
                          bgcolor: '#F8FAFC',
                          borderRadius: 2,
                          border: '1px solid #E2E8F0',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 1.5,
                        }}
                      >
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#2563EB', mt: 0.75, flexShrink: 0 }} />
                        <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 500, lineHeight: 1.5 }}>
                          {point}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                </Card>
              </Grid>

              {/* Right Column: Customer Sentiment & Actions for Tomorrow */}
              <Grid item xs={12} md={5}>
                <Stack spacing={3} sx={{ height: '100%' }}>
                  {/* Customer Sentiment Card */}
                  <Card sx={{ p: 3, borderRadius: 2.5, border: '1px solid #E2E8F0' }}>
                    <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
                      <Box sx={{ width: 28, height: 28, borderRadius: 1, bgcolor: '#FDF2F8', color: '#DB2777', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <HeartIcon sx={{ fontSize: 18 }} />
                      </Box>
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        Customer Sentiment
                      </Typography>
                    </Stack>

                    <Box sx={{ p: 2, bgcolor: '#F8FAFC', borderRadius: 2, border: '1px solid #E2E8F0', mb: 2 }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                        <Typography variant="h5" sx={{ fontWeight: 800, color: dominantSentiment === 'POSITIVE' ? '#16A34A' : dominantSentiment === 'NEGATIVE' ? '#DC2626' : '#64748B' }}>
                          {dominantPercentage}% {dominantSentiment}
                        </Typography>
                        <Chip
                          size="small"
                          label={dominantSentiment}
                          sx={{
                            fontWeight: 700,
                            bgcolor: dominantSentiment === 'POSITIVE' ? '#DCFCE7' : dominantSentiment === 'NEGATIVE' ? '#FEE2E2' : '#F1F5F9',
                            color: dominantSentiment === 'POSITIVE' ? '#16A34A' : dominantSentiment === 'NEGATIVE' ? '#DC2626' : '#64748B',
                          }}
                        />
                      </Stack>
                      <LinearProgress
                        variant="determinate"
                        value={dominantPercentage}
                        sx={{
                          height: 8,
                          borderRadius: 4,
                          bgcolor: '#E2E8F0',
                          '& .MuiLinearProgress-bar': {
                            bgcolor: dominantSentiment === 'POSITIVE' ? '#16A34A' : dominantSentiment === 'NEGATIVE' ? '#DC2626' : '#64748B',
                          },
                        }}
                      />
                    </Box>

                    <Stack direction="row" justifyContent="space-between" sx={{ px: 1 }}>
                      <Typography variant="caption" sx={{ color: '#16A34A', fontWeight: 600 }}>
                        Positive: {sentimentCounts.POSITIVE}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600 }}>
                        Neutral: {sentimentCounts.NEUTRAL}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#DC2626', fontWeight: 600 }}>
                        Negative: {sentimentCounts.NEGATIVE}
                      </Typography>
                    </Stack>
                  </Card>

                  {/* Actions for Tomorrow Card */}
                  <Card sx={{ p: 3, borderRadius: 2.5, border: '1px solid #E2E8F0', flex: 1 }}>
                    <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
                      <Box sx={{ width: 28, height: 28, borderRadius: 1, bgcolor: '#F0FDF4', color: '#16A34A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <TargetIcon sx={{ fontSize: 18 }} />
                      </Box>
                      <Typography variant="h6" sx={{ fontWeight: 700 }}>
                        Actions for Tomorrow
                      </Typography>
                    </Stack>

                    <Stack spacing={1.5}>
                      {actionsTomorrow.map((action, idx) => (
                        <Box
                          key={idx}
                          sx={{
                            p: 2,
                            bgcolor: '#F8FAFC',
                            borderRadius: 2,
                            border: '1px solid #E2E8F0',
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 1.5,
                          }}
                        >
                          <Box
                            sx={{
                              width: 22,
                              height: 22,
                              borderRadius: 1,
                              bgcolor: '#16A34A',
                              color: '#FFFFFF',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: '0.75rem',
                              flexShrink: 0,
                            }}
                          >
                            {idx + 1}
                          </Box>
                          <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 500, lineHeight: 1.5 }}>
                            {action}
                          </Typography>
                        </Box>
                      ))}
                    </Stack>
                  </Card>
                </Stack>
              </Grid>
            </Grid>
          )}

          {/* D. Conversation Index Table (Screenshot 2) */}
          {conversations.length > 0 && (
            <Card sx={{ borderRadius: 2.5, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
              <Box sx={{ p: 2.5, borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ width: 28, height: 28, borderRadius: 1, bgcolor: '#EFF6FF', color: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ForumIcon sx={{ fontSize: 18 }} />
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Conversation Index
                </Typography>
                <Chip size="small" label={`${conversations.length} records`} sx={{ ml: 'auto', fontWeight: 600 }} />
              </Box>

              <TableContainer>
                <Table sx={{ minWidth: 700 }}>
                  <TableHead sx={{ bgcolor: '#F8FAFC' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700, color: 'text.secondary', width: 50 }}>#</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>DETAILS</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>DURATION</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>SENTIMENT</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>WORDS</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>OUTCOME</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: 'text.secondary', textAlign: 'right' }}>ACTIONS</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {conversations.map((c, index) => {
                      const isPlaying = playingSessionId === c.sessionId;
                      const hasAudio = Boolean(c.audioUrl || c.audioFileName);
                      const timeStr = c.startedAt ? new Date(c.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'N/A';

                      return (
                        <TableRow key={c.sessionId || index} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                          <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>
                            {index + 1}
                          </TableCell>
                          <TableCell>
                            <Stack direction="row" spacing={1.5} alignItems="center">
                              {/* Audio Playback Button */}
                              <Tooltip title={hasAudio ? (isPlaying ? 'Pause Recording' : 'Listen to Recording') : 'Recording unavailable'}>
                                <span>
                                  <IconButton
                                    size="small"
                                    disabled={!hasAudio}
                                    onClick={() => handleToggleAudio(c)}
                                    sx={{
                                      bgcolor: isPlaying ? '#2563EB' : hasAudio ? '#EFF6FF' : '#F1F5F9',
                                      color: isPlaying ? '#FFFFFF' : hasAudio ? '#2563EB' : '#94A3B8',
                                      '&:hover': {
                                        bgcolor: isPlaying ? '#1D4ED8' : hasAudio ? '#DBEAFE' : '#F1F5F9',
                                      },
                                    }}
                                  >
                                    {isPlaying ? <PauseIcon sx={{ fontSize: 18 }} /> : <PlayIcon sx={{ fontSize: 18 }} />}
                                  </IconButton>
                                </span>
                              </Tooltip>

                              <Box>
                                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                                  {timeStr}
                                </Typography>
                                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                  {c.storeCode || c.storeName || 'Counter Terminal'}
                                </Typography>
                              </Box>
                            </Stack>
                          </TableCell>

                          <TableCell sx={{ color: 'text.primary', fontWeight: 600 }}>
                            {c.durationFormatted || `${c.durationSeconds || 0}s`}
                          </TableCell>

                          <TableCell>
                            <Chip
                              size="small"
                              label={c.sentiment || 'NEUTRAL'}
                              sx={{
                                fontWeight: 700,
                                fontSize: '0.6875rem',
                                bgcolor: c.sentiment === 'POSITIVE' ? '#DCFCE7' : c.sentiment === 'NEGATIVE' ? '#FEE2E2' : '#F1F5F9',
                                color: c.sentiment === 'POSITIVE' ? '#16A34A' : c.sentiment === 'NEGATIVE' ? '#DC2626' : '#64748B',
                              }}
                            />
                          </TableCell>

                          <TableCell sx={{ color: 'text.secondary', fontWeight: 600 }}>
                            {c.wordCount || (c.transcripts ? c.transcripts.length * 8 : 0)}
                          </TableCell>

                          <TableCell>
                            <Chip
                              size="small"
                              label={c.isSaleVerified ? 'Verified Sale' : c.salesOutcome === 'Won' ? 'Sale (Unverified)' : c.salesOutcome === 'Lost' ? 'No Sale' : 'Follow-up'}
                              sx={{
                                fontWeight: 600,
                                fontSize: '0.75rem',
                                bgcolor: c.isSaleVerified ? '#DCFCE7' : c.salesOutcome === 'Lost' ? '#FEE2E2' : '#F8FAFC',
                                color: c.isSaleVerified ? '#16A34A' : c.salesOutcome === 'Lost' ? '#DC2626' : '#475569',
                                border: '1px solid #E2E8F0',
                              }}
                            />
                          </TableCell>

                          <TableCell sx={{ textAlign: 'right' }}>
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<ViewIcon />}
                              onClick={() => {
                                setActiveTranscriptSession(c);
                                setTranscriptModalOpen(true);
                              }}
                              sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 1.5, fontSize: '0.75rem' }}
                            >
                              View Transcript
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </Card>
          )}

          {/* E. Interactions & Coaching Section (Screenshot 1) */}
          {conversations.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
                <Box sx={{ width: 28, height: 28, borderRadius: 1, bgcolor: '#F5F3FF', color: '#7C3AED', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ForumIcon sx={{ fontSize: 18 }} />
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Interactions & Coaching
                </Typography>
              </Stack>

              <Stack spacing={2}>
                {conversations.map((c, index) => {
                  const timeStr = c.startedAt ? new Date(c.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'N/A';
                  const score = c.score || (c.salesOutcome === 'Won' ? 4 : c.salesOutcome === 'Lost' ? 2 : 3);

                  return (
                    <Card key={c.sessionId || index} sx={{ p: 3, borderRadius: 2.5, border: '1px solid #E2E8F0', bgcolor: 'background.paper' }}>
                      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
                        <Box
                          sx={{
                            width: 30,
                            height: 30,
                            borderRadius: 1,
                            bgcolor: '#F1F5F9',
                            color: 'text.primary',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '0.875rem',
                          }}
                        >
                          {index + 1}
                        </Box>
                        <Box>
                          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                            Interaction at {timeStr}
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                            {c.durationFormatted || `${c.durationSeconds || 0}s`} • {c.sentiment || 'NEUTRAL'} • Score: {score}/5
                          </Typography>
                        </Box>
                      </Stack>

                      {/* Purple Coaching Note Box (Screenshot 1) */}
                      <Box
                        sx={{
                          p: 2,
                          borderRadius: 2,
                          bgcolor: '#F5F3FF',
                          border: '1px solid #DDD6FE',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 1.5,
                        }}
                      >
                        <Box sx={{ width: 20, height: 20, borderRadius: '50%', bgcolor: '#7C3AED', color: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', mt: 0.25, flexShrink: 0 }}>
                          <WaveIcon sx={{ fontSize: 12 }} />
                        </Box>
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#6D28D9', mb: 0.5 }}>
                            Coaching Note:
                          </Typography>
                          <Typography variant="body2" sx={{ color: '#4C1D95', lineHeight: 1.6 }}>
                            {c.coachingNote}
                          </Typography>
                        </Box>
                      </Box>
                    </Card>
                  );
                })}
              </Stack>
            </Box>
          )}
        </Stack>
      )}

      {/* 4. Full English Transcript Modal */}
      <Dialog
        open={transcriptModalOpen}
        onClose={() => setTranscriptModalOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ m: 0, p: 2.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Conversation Transcript
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Session: {activeTranscriptSession?.sessionId} • {activeTranscriptSession?.storeCode} • {activeTranscriptSession?.durationFormatted}
            </Typography>
          </Box>
          <IconButton onClick={() => setTranscriptModalOpen(false)} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ p: 3, maxHeight: 480, overflowY: 'auto', bgcolor: '#F8FAFC' }}>
          {activeTranscriptSession?.transcripts && activeTranscriptSession.transcripts.length > 0 ? (
            <Stack spacing={2}>
              {activeTranscriptSession.transcripts.map((t, idx) => {
                const isSales = (t.speaker || '').toLowerCase().includes('sales');
                return (
                  <Box
                    key={idx}
                    sx={{
                      p: 2,
                      bgcolor: isSales ? '#EFF6FF' : '#FFFFFF',
                      borderRadius: 2,
                      border: '1px solid',
                      borderColor: isSales ? '#BFDBFE' : '#E2E8F0',
                    }}
                  >
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.75 }}>
                      <Chip
                        size="small"
                        label={isSales ? 'Sales Specialist' : 'Customer'}
                        sx={{
                          height: 20,
                          fontSize: '0.6875rem',
                          fontWeight: 700,
                          bgcolor: isSales ? '#DBEAFE' : '#FEF3C7',
                          color: isSales ? '#1D4ED8' : '#D97706',
                        }}
                      />
                      {t.timestamp && (
                        <Typography variant="caption" sx={{ color: '#64748B', fontFamily: 'monospace' }}>
                          [{new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}]
                        </Typography>
                      )}
                      {t.isTranslated && (
                        <Chip size="small" label="Translated to English" sx={{ height: 18, fontSize: '0.625rem', bgcolor: '#EEF2FF', color: '#4338CA' }} />
                      )}
                    </Stack>
                    <Typography variant="body2" sx={{ color: 'text.primary', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                      {t.text || t.englishText}
                    </Typography>
                  </Box>
                );
              })}
            </Stack>
          ) : (
            <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
              <Typography variant="body2">
                No spoken dialogue transcript recorded for this conversation session.
              </Typography>
            </Box>
          )}
        </DialogContent>
        <Divider />
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setTranscriptModalOpen(false)} variant="outlined" sx={{ fontWeight: 600 }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
