/**
 * Storelistener — Comprehensive Conversation AI Report Modal
 * File: src/components/monitoring/ConversationReportModal.jsx
 *
 * Implements the 9-Section Complete AI Intelligence Report:
 * A. Conversation details (ID, Date, Start/End, Duration, Store, Salesperson, Status)
 * B. Complete transcript (Chronological readable paragraphs, authentic dialogue, diarization status)
 * C. Executive summary (Interaction overview, customer objective, outcome)
 * D. Customer needs & intent (Requirements, products, budget/timeline, questions)
 * E. Sales outcome (Won, Lost, Pending, Inconclusive with evidence explanation)
 * F. Objections & concerns (Customer hesitations, price barriers, or clear 'none' state)
 * G. Salesperson performance (Needs discovery, product knowledge, objection handling, clarity, closing, missed opportunities)
 * H. Recommendations & next steps (Follow-up actions, next contact, opportunities)
 * I. Evidence & confidence (Verbatim excerpts, key moments, confidence notes)
 *
 * Plus:
 * - PDF Export via downloadSingleConversationReport
 * - CSV Export
 * - Server-side idempotent analysis retry / re-run
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Button,
  IconButton,
  Box,
  Grid,
  Stack,
  Chip,
  Paper,
  Alert,
  Divider,
  Tabs,
  Tab,
  CircularProgress,
  Tooltip,
  LinearProgress,
} from '@mui/material';
import {
  Close as CloseIcon,
  AutoAwesome as AiIcon,
  PictureAsPdf as PdfIcon,
  Download as ExportIcon,
  Refresh as RefreshIcon,
  CheckCircle as WonIcon,
  Cancel as LostIcon,
  HourglassEmpty as PendingIcon,
  HelpOutline as InconclusiveIcon,
  Psychology as IntentIcon,
  Storefront as StoreIcon,
  Person as RepIcon,
  AccessTime as TimeIcon,
  FormatQuote as QuoteIcon,
  Lightbulb as RecommendationIcon,
  Assessment as ScorecardIcon,
  RecordVoiceOver as TranscriptIcon,
  HelpOutline as QuestionIcon,
  WarningAmber as ObjectionIcon,
} from '@mui/icons-material';

import { BACKEND_URL } from '../../config/api';
import { downloadSingleConversationReport } from '../../utils/pdfReportService';
import { formatIntoParagraphs } from '../../utils/paragraphFormatter';

const OUTCOME_CONFIG = {
  Won: {
    color: '#15803D',
    bgColor: '#F0FDF4',
    borderColor: '#BBF7D0',
    icon: WonIcon,
    label: 'Won (Sale Confirmed)',
  },
  Lost: {
    color: '#B91C1C',
    bgColor: '#FEF2F2',
    borderColor: '#FECACA',
    icon: LostIcon,
    label: 'Lost (Not Converted)',
  },
  Pending: {
    color: '#B45309',
    bgColor: '#FFFBEB',
    borderColor: '#FDE68A',
    icon: PendingIcon,
    label: 'Pending (Follow-up Required)',
  },
  Inconclusive: {
    color: '#64748B',
    bgColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    icon: InconclusiveIcon,
    label: 'Inconclusive (Unclear Outcome)',
  },
};

export default function ConversationReportModal({ open, conversation, onClose, currentUser }) {
  const [activeTab, setActiveTab] = useState(0);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisData, setAnalysisData] = useState(null);
  const [scorecardData, setScorecardData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const sessionId = conversation?.sessionId || conversation?.id;

  // Fetch persisted report from backend whenever conversation opens
  useEffect(() => {
    if (!open || !sessionId) return;

    let isMounted = true;
    setLoading(true);
    setErrorMessage(null);

    fetch(`${BACKEND_URL}/api/sessions/${sessionId}/analysis`, {
      credentials: 'include',
    })
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        if (data.success) {
          setAnalysisData(data.dealAnalysis || conversation?.dealAnalysis || null);
          setScorecardData(data.scorecard || conversation?.scorecard || null);
        } else {
          setAnalysisData(conversation?.dealAnalysis || null);
          setScorecardData(conversation?.scorecard || null);
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        console.warn('Could not fetch stored analysis:', err.message);
        setAnalysisData(conversation?.dealAnalysis || null);
        setScorecardData(conversation?.scorecard || null);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [open, sessionId, conversation]);

  if (!open || !conversation) return null;

  // Force re-run analysis
  const handleTriggerAnalysis = async () => {
    if (!sessionId) return;
    setAnalyzing(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`${BACKEND_URL}/api/sessions/${sessionId}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ force: true }),
      });
      const data = await res.json();
      if (data.success) {
        setAnalysisData(data.dealAnalysis);
        setScorecardData(data.scorecard);
      } else {
        setErrorMessage(data.error || 'Failed to analyze conversation.');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Network error triggering analysis.');
    } finally {
      setAnalyzing(false);
    }
  };

  // Export PDF
  const handleDownloadPdf = () => {
    try {
      downloadSingleConversationReport({
        session: conversation,
        dealAnalysis: analysisData,
        scorecard: scorecardData,
        currentUser,
      });
    } catch (err) {
      console.error('PDF export failed:', err);
      alert('Failed to generate PDF report.');
    }
  };

  // Export CSV
  const handleExportCsv = () => {
    try {
      const rows = [
        ['Field', 'Value'],
        ['Session ID', sessionId],
        ['Store', conversation.storeName || conversation.storeCode || 'Store'],
        ['Salesperson', conversation.salesRep || 'Sales Specialist'],
        ['Date', conversation.startedAt ? new Date(conversation.startedAt).toLocaleString() : 'N/A'],
        ['Duration', `${conversation.durationSeconds || 0} seconds`],
        ['Outcome', analysisData?.salesOutcome || analysisData?.conversationOutcome || 'Pending'],
        ['Buying Intent', analysisData?.customerBuyingIntent || 'Unclear'],
        ['Executive Summary', `"${(analysisData?.summary || '').replace(/"/g, '""')}"`],
        ['Customer Requirements', `"${(analysisData?.customerRequirements || '').replace(/"/g, '""')}"`],
        ['Products Discussed', `"${(analysisData?.productsDiscussed || []).join(', ').replace(/"/g, '""')}"`],
        ['Next Recommended Action', `"${(analysisData?.nextRecommendedAction || '').replace(/"/g, '""')}"`],
      ];

      const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `Conversation-Report-${sessionId.slice(-8)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('CSV export failed:', err);
    }
  };

  // Resolve outcome classification
  let normalizedOutcome = analysisData?.salesOutcome;
  if (!normalizedOutcome) {
    const raw = analysisData?.conversationOutcome || conversation.analytics?.dealOutcome || '';
    if (raw === 'Sale Confirmed' || raw === 'won') normalizedOutcome = 'Won';
    else if (raw === 'Not Converted' || raw === 'lost') normalizedOutcome = 'Lost';
    else if (raw === 'Follow-up Required' || raw === 'in_negotiation') normalizedOutcome = 'Pending';
    else normalizedOutcome = 'Inconclusive';
  }

  const outcomeMeta = OUTCOME_CONFIG[normalizedOutcome] || OUTCOME_CONFIG.Inconclusive;
  const OutcomeIconComponent = outcomeMeta.icon;

  // Format raw transcripts into paragraphs
  const rawTranscripts = Array.isArray(conversation.transcripts) && conversation.transcripts.length > 0
    ? conversation.transcripts
    : (Array.isArray(conversation.transcript) ? conversation.transcript : []);

  const formattedParagraphs = formatIntoParagraphs(rawTranscripts);
  const hasDiarization = rawTranscripts.some((t) => t.speaker && t.speaker !== 'system');

  const durationSec = conversation.durationSeconds || 0;
  const durationFormatted = durationSec > 0 ? `${Math.floor(durationSec / 60)}m ${durationSec % 60}s` : 'N/A';

  const analysisStatus = analysisData?.analysisStatus || (analysisData ? 'completed' : 'pending');

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          bgcolor: '#ffffff',
          boxShadow: '0 24px 48px rgba(15, 23, 42, 0.16)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '92vh',
        },
      }}
    >
      {/* Header */}
      <DialogTitle sx={{ p: 2.5, pb: 2, borderBottom: '1px solid #E2E8F0', bgcolor: '#F8FAFC' }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={1.5}>
          <Box>
            <Stack direction="row" spacing={1} alignItems="center">
              <AiIcon sx={{ color: '#6D28D9', fontSize: 24 }} />
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>
                Conversation AI Intelligence Report
              </Typography>
              <Chip
                label={`#${sessionId?.slice(-8) || sessionId}`}
                size="small"
                sx={{
                  bgcolor: '#F3E8FF',
                  color: '#6D28D9',
                  fontWeight: 700,
                  fontSize: '0.75rem',
                }}
              />
              <Chip
                label={analysisStatus.toUpperCase()}
                size="small"
                sx={{
                  bgcolor: analysisStatus === 'completed' ? '#ECFDF5' : analysisStatus === 'failed' ? '#FEF2F2' : '#EFF6FF',
                  color: analysisStatus === 'completed' ? '#047857' : analysisStatus === 'failed' ? '#B91C1C' : '#1D4ED8',
                  fontWeight: 700,
                  fontSize: '0.7rem',
                }}
              />
            </Stack>
            <Typography variant="caption" sx={{ color: '#64748B', mt: 0.5, display: 'block' }}>
              {conversation.storeName || conversation.storeCode || 'iPhone Store'} • Specialist: <strong>{conversation.salesRep || 'Sales Specialist'}</strong> • Duration: {durationFormatted} • {conversation.startedAt ? new Date(conversation.startedAt).toLocaleString() : 'Recent'}
            </Typography>
          </Box>

          {/* Action Toolbar */}
          <Stack direction="row" spacing={1} alignItems="center">
            <Button
              size="small"
              variant="outlined"
              startIcon={<PdfIcon />}
              onClick={handleDownloadPdf}
              sx={{ fontWeight: 600, fontSize: '0.8125rem' }}
            >
              PDF Report
            </Button>
            <Button
              size="small"
              variant="outlined"
              startIcon={<ExportIcon />}
              onClick={handleExportCsv}
              sx={{ fontWeight: 600, fontSize: '0.8125rem' }}
            >
              CSV
            </Button>
            <Tooltip title="Re-evaluate AI analysis and rubric">
              <span>
                <IconButton
                  size="small"
                  onClick={handleTriggerAnalysis}
                  disabled={analyzing}
                  sx={{ color: '#64748B' }}
                >
                  {analyzing ? <CircularProgress size={18} /> : <RefreshIcon fontSize="small" />}
                </IconButton>
              </span>
            </Tooltip>
            <IconButton onClick={onClose} size="small" sx={{ color: '#64748B' }}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Stack>
        </Stack>

        {/* Tab Navigation */}
        <Tabs
          value={activeTab}
          onChange={(e, val) => setActiveTab(val)}
          sx={{
            minHeight: 40,
            mt: 2,
            borderBottom: '1px solid #E2E8F0',
            '& .MuiTab-root': {
              minHeight: 40,
              py: 0.5,
              fontSize: '0.85rem',
              fontWeight: 700,
              textTransform: 'none',
            },
          }}
        >
          <Tab icon={<AiIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="AI Report & Scorecard" />
          <Tab icon={<TranscriptIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Full Transcript Dialogue" />
        </Tabs>
      </DialogTitle>

      {/* Loading & Analyzing Bar */}
      {(loading || analyzing) && <LinearProgress color="secondary" />}

      {/* Content Area */}
      <DialogContent sx={{ p: 3, flex: 1, overflowY: 'auto' }}>
        {errorMessage && (
          <Alert severity="error" sx={{ mb: 2.5 }} onClose={() => setErrorMessage(null)}>
            {errorMessage}
          </Alert>
        )}

        {/* TAB 0: 9-SECTION AI REPORT */}
        {activeTab === 0 && (
          <Stack spacing={3}>
            {/* KPI Banner Cards */}
            <Grid container spacing={2}>
              {/* Sales Outcome Card (Section E) */}
              <Grid item xs={12} sm={6} md={3}>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2,
                    borderRadius: 2.5,
                    bgcolor: outcomeMeta.bgColor,
                    borderColor: outcomeMeta.borderColor,
                    height: '100%',
                  }}
                >
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <OutcomeIconComponent sx={{ color: outcomeMeta.color, fontSize: 28 }} />
                    <Box>
                      <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600 }}>
                        E. Sales Outcome
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 800, color: outcomeMeta.color, lineHeight: 1.2 }}>
                        {normalizedOutcome}
                      </Typography>
                      <Typography variant="caption" sx={{ color: outcomeMeta.color, display: 'block', mt: 0.25 }}>
                        {analysisData?.conversationOutcome || 'Verified classification'}
                      </Typography>
                    </Box>
                  </Stack>
                </Paper>
              </Grid>

              {/* Buying Intent Card (Section D) */}
              <Grid item xs={12} sm={6} md={3}>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2,
                    borderRadius: 2.5,
                    bgcolor: '#EFF6FF',
                    borderColor: '#BFDBFE',
                    height: '100%',
                  }}
                >
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <IntentIcon sx={{ color: '#1D4ED8', fontSize: 28 }} />
                    <Box>
                      <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600 }}>
                        D. Buying Intent
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 800, color: '#1D4ED8', lineHeight: 1.2 }}>
                        {analysisData?.customerBuyingIntent || 'Unclear'} Intent
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#2563EB', display: 'block', mt: 0.25 }}>
                        Intent signals analyzed
                      </Typography>
                    </Box>
                  </Stack>
                </Paper>
              </Grid>

              {/* Rubric Scorecard (Section G) */}
              <Grid item xs={12} sm={6} md={3}>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2,
                    borderRadius: 2.5,
                    bgcolor: '#F5F3FF',
                    borderColor: '#DDD6FE',
                    height: '100%',
                  }}
                >
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <ScorecardIcon sx={{ color: '#6D28D9', fontSize: 28 }} />
                    <Box>
                      <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600 }}>
                        G. Rep Quality Rubric
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 800, color: '#6D28D9', lineHeight: 1.2 }}>
                        {scorecardData?.overallScore != null ? `${scorecardData.overallScore} / 100` : 'Evaluated'}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#7C3AED', display: 'block', mt: 0.25 }}>
                        8-dimension sales rubric
                      </Typography>
                    </Box>
                  </Stack>
                </Paper>
              </Grid>

              {/* Session Duration & Capture */}
              <Grid item xs={12} sm={6} md={3}>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2,
                    borderRadius: 2.5,
                    bgcolor: '#F8FAFC',
                    borderColor: '#E2E8F0',
                    height: '100%',
                  }}
                >
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <TimeIcon sx={{ color: '#475569', fontSize: 28 }} />
                    <Box>
                      <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600 }}>
                        A. Spoken Duration
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 800, color: '#0F172A', lineHeight: 1.2 }}>
                        {durationFormatted}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#64748B', display: 'block', mt: 0.25 }}>
                        {rawTranscripts.length} dialogue segments
                      </Typography>
                    </Box>
                  </Stack>
                </Paper>
              </Grid>
            </Grid>

            {/* SECTION A: CONVERSATION DETAILS */}
            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2.5, borderColor: '#E2E8F0' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0F172A', mb: 1.5, letterSpacing: '0.02em' }}>
                SECTION A: CONVERSATION DETAILS
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="caption" sx={{ color: '#64748B', display: 'block' }}>Conversation ID</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: '#0F172A' }}>{sessionId}</Typography>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="caption" sx={{ color: '#64748B', display: 'block' }}>Store & Location</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: '#0F172A' }}>
                    {conversation.storeName || conversation.storeCode || 'iPhone Store'} ({conversation.storeCode || 'STORE-01'})
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="caption" sx={{ color: '#64748B', display: 'block' }}>Sales Specialist</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: '#0F172A' }}>
                    {conversation.salesRep || 'Sales Specialist'}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Typography variant="caption" sx={{ color: '#64748B', display: 'block' }}>Recorded Timestamp</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: '#0F172A' }}>
                    {conversation.startedAt ? new Date(conversation.startedAt).toLocaleString() : 'N/A'}
                  </Typography>
                </Grid>
              </Grid>
            </Paper>

            {/* SECTION C: EXECUTIVE SUMMARY */}
            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2.5, borderColor: '#E2E8F0', bgcolor: '#FBFBFC' }}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                <QuoteIcon sx={{ color: '#6366F1' }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0F172A' }}>
                  SECTION C: EXECUTIVE SUMMARY
                </Typography>
              </Stack>
              <Typography variant="body2" sx={{ color: '#334155', lineHeight: 1.6 }}>
                {analysisData?.summary || 'Session recorded. Customer consulted with retail specialist regarding Apple iPhone inventory and offerings.'}
              </Typography>
            </Paper>

            {/* SECTION D: CUSTOMER NEEDS AND INTENT */}
            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2.5, borderColor: '#E2E8F0' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0F172A', mb: 2 }}>
                SECTION D: CUSTOMER NEEDS AND INTENT
              </Typography>
              <Grid container spacing={2.5}>
                <Grid item xs={12} md={6}>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748B', display: 'block', mb: 0.5 }}>
                    Products / Services of Interest
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    {Array.isArray(analysisData?.productsDiscussed) && analysisData.productsDiscussed.length > 0 ? (
                      analysisData.productsDiscussed.map((prod, idx) => (
                        <Chip
                          key={idx}
                          label={prod}
                          size="small"
                          sx={{ bgcolor: '#EFF6FF', color: '#1D4ED8', fontWeight: 600, border: '1px solid #BFDBFE' }}
                        />
                      ))
                    ) : (
                      <Typography variant="body2" sx={{ color: '#64748B' }}>None explicitly specified</Typography>
                    )}
                  </Stack>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748B', display: 'block', mb: 0.5 }}>
                    Stated Budget, Financing & Price
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#0F172A' }}>
                    {analysisData?.budgetAndPrice || 'Not mentioned in spoken dialogue'}
                  </Typography>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748B', display: 'block', mb: 0.5 }}>
                    Customer Requirements & Preferences
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#334155' }}>
                    {analysisData?.customerRequirements || 'General product exploration and features consultation.'}
                  </Typography>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748B', display: 'block', mb: 0.5 }}>
                    Customer Questions & Inquiries
                  </Typography>
                  {Array.isArray(analysisData?.customerQuestions) && analysisData.customerQuestions.length > 0 ? (
                    <Stack spacing={0.5}>
                      {analysisData.customerQuestions.map((q, idx) => (
                        <Typography key={idx} variant="body2" sx={{ color: '#334155' }}>
                          • {q}
                        </Typography>
                      ))}
                    </Stack>
                  ) : (
                    <Typography variant="body2" sx={{ color: '#64748B' }}>No explicit customer questions recorded</Typography>
                  )}
                </Grid>
              </Grid>
            </Paper>

            {/* SECTION E: SALES OUTCOME */}
            <Paper
              variant="outlined"
              sx={{
                p: 2.5,
                borderRadius: 2.5,
                bgcolor: outcomeMeta.bgColor,
                borderColor: outcomeMeta.borderColor,
              }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: outcomeMeta.color, mb: 1 }}>
                SECTION E: SALES OUTCOME ({normalizedOutcome.toUpperCase()})
              </Typography>
              <Typography variant="body2" sx={{ color: '#1E293B', lineHeight: 1.6, mb: 1.5 }}>
                {analysisData?.outcomeExplanation || (
                  normalizedOutcome === 'Won'
                    ? 'Customer confirmed purchase transaction with payment or explicit agreement to purchase.'
                    : normalizedOutcome === 'Lost'
                    ? 'Customer walked away, rejected the offer, or cited prohibitive budget constraints without purchasing.'
                    : normalizedOutcome === 'Pending'
                    ? 'Customer expressed purchase intent but requested time to consult or scheduled a follow-up consultation. Transaction is pending.'
                    : 'The spoken dialogue ended without an explicit sale confirmation or conclusive outcome.'
                )}
              </Typography>
              <Alert severity="info" sx={{ bgcolor: 'rgba(255,255,255,0.7)', border: '1px solid rgba(0,0,0,0.06)' }}>
                <strong>Strict Verification Standard: </strong>
                Storelistener distinguishes between a verbal agreement, an expressed intention to purchase, and a verified completed transaction. Sales are never recorded as won without explicit transaction dialogue.
              </Alert>
            </Paper>

            {/* SECTION F: OBJECTIONS AND CONCERNS */}
            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2.5, borderColor: '#E2E8F0' }}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
                <ObjectionIcon sx={{ color: '#D97706' }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0F172A' }}>
                  SECTION F: OBJECTIONS AND CONCERNS
                </Typography>
              </Stack>
              {Array.isArray(analysisData?.customerObjections) && analysisData.customerObjections.length > 0 ? (
                <Stack spacing={1}>
                  {analysisData.customerObjections.map((obj, idx) => (
                    <Box key={idx} sx={{ p: 1.5, bgcolor: '#FFFBEB', borderRadius: 2, border: '1px solid #FDE68A' }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#B45309' }}>
                        • {obj}
                      </Typography>
                    </Box>
                  ))}
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: '#64748B' }}>
                      Specialist Response:
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#334155', mt: 0.5 }}>
                      {analysisData?.salespersonResponse || 'Consultative explanation provided.'}
                    </Typography>
                  </Box>
                </Stack>
              ) : (
                <Typography variant="body2" sx={{ color: '#64748B', fontStyle: 'italic' }}>
                  No explicit objections or pricing hesitation were identified during this session.
                </Typography>
              )}
            </Paper>

            {/* SECTION G: SALESPERSON PERFORMANCE */}
            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2.5, borderColor: '#E2E8F0' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0F172A', mb: 2 }}>
                SECTION G: SALESPERSON PERFORMANCE EVALUATION
              </Typography>
              <Grid container spacing={2}>
                {[
                  {
                    key: 'understandingRequirements',
                    label: 'Needs Discovery',
                    desc: 'Clarified customer device requirements, usage habits, and preferences.',
                  },
                  {
                    key: 'productKnowledge',
                    label: 'Product Knowledge & Explanation',
                    desc: 'Explained hardware capabilities, camera, battery, and chip differences.',
                  },
                  {
                    key: 'responseToObjections',
                    label: 'Handling of Objections',
                    desc: 'Constructive handling of price, trade-in valuation, or hesitation.',
                  },
                  {
                    key: 'communicationClarity',
                    label: 'Communication Clarity',
                    desc: 'Professional, articulate tone without unnecessary jargon.',
                  },
                  {
                    key: 'closingAttempt',
                    label: 'Closing Attempt & Follow-up',
                    desc: 'Prompted transaction close or scheduled next contact touchpoint.',
                  },
                ].map((item) => {
                  const dim = scorecardData?.dimensions?.[item.key] || {};
                  return (
                    <Grid item xs={12} sm={6} key={item.key}>
                      <Box sx={{ p: 1.5, bgcolor: '#F8FAFC', borderRadius: 2, border: '1px solid #E2E8F0', height: '100%' }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0F172A' }}>
                            {item.label}
                          </Typography>
                          {dim.score != null && (
                            <Chip
                              label={`${dim.score} / 10`}
                              size="small"
                              sx={{
                                bgcolor: dim.score >= 8 ? '#ECFDF5' : dim.score >= 5 ? '#FFFBEB' : '#FEF2F2',
                                color: dim.score >= 8 ? '#047857' : dim.score >= 5 ? '#B45309' : '#B91C1C',
                                fontWeight: 700,
                              }}
                            />
                          )}
                        </Stack>
                        <Typography variant="caption" sx={{ color: '#64748B', display: 'block', mb: 1 }}>
                          {item.desc}
                        </Typography>
                        {dim.evidence ? (
                          <Typography variant="caption" sx={{ color: '#334155', fontStyle: 'italic', display: 'block' }}>
                            "{dim.evidence}"
                          </Typography>
                        ) : (
                          <Typography variant="caption" sx={{ color: '#94A3B8' }}>
                            Grounded in dialogue observation
                          </Typography>
                        )}
                      </Box>
                    </Grid>
                  );
                })}

                {/* Missed Opportunities */}
                <Grid item xs={12}>
                  <Box sx={{ p: 1.5, bgcolor: '#FEF2F2', borderRadius: 2, border: '1px solid #FECACA' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#B91C1C', mb: 0.5 }}>
                      Missed Opportunities & Coaching Points
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#7F1D1D' }}>
                      {scorecardData?.coachingFeedback?.areasToImprove?.[0] || 'Proactively introduce AppleCare+ and official trade-in valuation earlier in consultation.'}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </Paper>

            {/* SECTION H: RECOMMENDATIONS AND NEXT STEPS */}
            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2.5, borderColor: '#E2E8F0', bgcolor: '#F0FDF4' }}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                <RecommendationIcon sx={{ color: '#15803D' }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#15803D' }}>
                  SECTION H: RECOMMENDATIONS AND NEXT STEPS
                </Typography>
              </Stack>
              <Typography variant="body2" sx={{ color: '#14532D', lineHeight: 1.6, fontWeight: 500 }}>
                {analysisData?.nextRecommendedAction || 'Follow up with customer regarding quoted specifications within 24 hours while interest is fresh.'}
              </Typography>
            </Paper>

            {/* SECTION I: EVIDENCE AND CONFIDENCE */}
            <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 2.5, borderColor: '#E2E8F0' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0F172A', mb: 1.5 }}>
                SECTION I: EVIDENCE AND CONFIDENCE
              </Typography>
              {Array.isArray(analysisData?.keyMoments) && analysisData.keyMoments.length > 0 ? (
                <Stack spacing={1.5}>
                  {analysisData.keyMoments.map((km, idx) => (
                    <Box key={idx} sx={{ p: 1.5, bgcolor: '#F8FAFC', borderRadius: 2, border: '1px solid #E2E8F0' }}>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                        <Chip
                          label={km.speaker || 'Dialogue Excerpt'}
                          size="small"
                          sx={{ height: 20, fontSize: '0.7rem', fontWeight: 700 }}
                        />
                        <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 600 }}>
                          {km.significance}
                        </Typography>
                      </Stack>
                      <Typography variant="body2" sx={{ color: '#0F172A', fontStyle: 'italic' }}>
                        "{km.excerpt}"
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              ) : (
                <Typography variant="body2" sx={{ color: '#64748B', fontStyle: 'italic' }}>
                  Analysis grounded directly in full session transcript without external assumptions.
                </Typography>
              )}
            </Paper>
          </Stack>
        )}

        {/* TAB 1: SECTION B - COMPLETE TRANSCRIPT */}
        {activeTab === 1 && (
          <Stack spacing={2.5}>
            {/* Diarization Notice */}
            <Alert
              severity={hasDiarization ? 'success' : 'info'}
              sx={{ fontSize: '0.8125rem', py: 0.5 }}
            >
              {hasDiarization
                ? 'Speaker diarization active: Recognized Customer and Sales Specialist dialogue in chronological order.'
                : 'Note: Speakers could not be reliably distinguished from single-channel microphone input. Displaying complete chronological speech.'}
            </Alert>

            {/* Complete Paragraphs */}
            {formattedParagraphs.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <Typography variant="body2" sx={{ color: '#64748B' }}>
                  No spoken transcript recorded for this conversation.
                </Typography>
              </Box>
            ) : (
              formattedParagraphs.map((para, idx) => {
                const isSales = para.speaker === 'Salesperson' || para.speaker === 'Sales Specialist';
                return (
                  <Box
                    key={idx}
                    sx={{
                      p: 2,
                      borderRadius: 2.5,
                      bgcolor: isSales ? '#F0FDF4' : '#F8FAFC',
                      border: '1px solid',
                      borderColor: isSales ? '#BBF7D0' : '#E2E8F0',
                    }}
                  >
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Chip
                          icon={isSales ? <RepIcon sx={{ fontSize: '14px !important' }} /> : <StoreIcon sx={{ fontSize: '14px !important' }} />}
                          label={hasDiarization ? (isSales ? 'Sales Specialist' : 'Customer') : `Dialogue Segment #${idx + 1}`}
                          size="small"
                          sx={{
                            fontWeight: 700,
                            bgcolor: isSales ? '#DCFCE7' : '#E2E8F0',
                            color: isSales ? '#15803D' : '#334155',
                          }}
                        />
                      </Stack>
                      {para.time && (
                        <Typography variant="caption" sx={{ color: '#94A3B8' }}>
                          {para.time}
                        </Typography>
                      )}
                    </Stack>
                    <Typography variant="body2" sx={{ color: '#1E293B', lineHeight: 1.7, whiteSpace: 'pre-line' }}>
                      {para.text}
                    </Typography>
                  </Box>
                );
              })
            )}
          </Stack>
        )}
      </DialogContent>

      {/* Footer */}
      <DialogActions sx={{ p: 2, px: 3, borderTop: '1px solid #E2E8F0', bgcolor: '#F8FAFC', justifyContent: 'space-between' }}>
        <Typography variant="caption" sx={{ color: '#64748B' }}>
          Storelistener Verified Enterprise Conversation Intelligence
        </Typography>
        <Button onClick={onClose} variant="contained" sx={{ fontWeight: 700 }}>
          Close Report
        </Button>
      </DialogActions>
    </Dialog>
  );
}
