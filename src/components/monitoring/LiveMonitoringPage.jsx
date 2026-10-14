/**
 * Storelistener — Redesigned Live Store Monitoring Page
 * File: src/components/monitoring/LiveMonitoringPage.jsx
 *
 * Implements:
 * Section A: Live Transcript
 *   - Displays only the currently active live conversation
 *   - Formatted in natural, readable paragraphs
 *   - Real-time incremental speech recognition updates
 *   - Pulsing "Listening..." animation during silence
 *   - "Transcribing..." animation during speech processing
 *   - Clean empty state: "No active conversation. Waiting for the next session."
 *   - Store authorization and branch selection
 *
 * Section B: Completed Conversations
 *   - Real backend data persisted in MongoDB
 *   - Calendar/date-picker filter with convenient Day Navigation & Clear Filter
 *   - Newest First / Oldest First sorting
 *   - Store & Salesperson multi-dimensional filtering
 *   - Start time, duration, store, salesperson, transcript preview, AI status badge
 *   - "View Report" action opening the 9-section Conversation AI Intelligence Report
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { io } from 'socket.io-client';
import {
  Box,
  Typography,
  Grid,
  Stack,
  Card,
  CardHeader,
  CardContent,
  Chip,
  Button,
  IconButton,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Tooltip,
  Divider,
  Alert,
  Pagination,
} from '@mui/material';
import {
  Sensors as LiveIcon,
  PictureAsPdf as PdfIcon,
  Download as ExportIcon,
  CalendarMonth as CalendarIcon,
  FilterList as FilterIcon,
  ArrowBackIos as PrevDayIcon,
  ArrowForwardIos as NextDayIcon,
  Today as TodayIcon,
  Clear as ClearIcon,
  SwapVert as SortIcon,
  Storefront as StoreIcon,
  Person as RepIcon,
  Search as SearchIcon,
  Visibility as ViewReportIcon,
  CheckCircle as CompletedIcon,
  HourglassEmpty as PendingIcon,
  Sync as ProcessingIcon,
  ErrorOutline as FailedIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';

import { BACKEND_URL, DEFAULT_SOCKET_OPTIONS } from '../../config/api';
import TranscriptPanel from './TranscriptPanel';
import ConversationReportModal from './ConversationReportModal';
import { downloadLiveMonitoringReport } from '../../utils/pdfReportService';

const AI_STATUS_CONFIG = {
  completed: {
    label: 'Completed',
    color: '#047857',
    bgcolor: '#ECFDF5',
    borderColor: '#A7F3D0',
    icon: CompletedIcon,
  },
  analyzing: {
    label: 'Processing',
    color: '#1D4ED8',
    bgcolor: '#EFF6FF',
    borderColor: '#BFDBFE',
    icon: ProcessingIcon,
  },
  pending: {
    label: 'Pending',
    color: '#B45309',
    bgcolor: '#FFFBEB',
    borderColor: '#FDE68A',
    icon: PendingIcon,
  },
  failed: {
    label: 'Failed',
    color: '#B91C1C',
    bgcolor: '#FEF2F2',
    borderColor: '#FECACA',
    icon: FailedIcon,
  },
  empty_skipped: {
    label: 'No Dialogue',
    color: '#64748B',
    bgcolor: '#F8FAFC',
    borderColor: '#E2E8F0',
    icon: PendingIcon,
  },
};

export default function LiveMonitoringPage({ currentUser, token }) {
  // --- Store & Authorization State ---
  const [stores, setStores] = useState([
    { id: 'all', code: 'ALL', name: 'All Retail Branches' },
    { id: 'store-01', code: 'STORE-NYC-01', name: 'iPhone Store 01 (Downtown)' },
    { id: 'store-02', code: 'STORE-BK-02', name: 'iPhone Store 02 (Brooklyn)' },
    { id: 'store-03', code: 'STORE-QNS-03', name: 'iPhone Store 03 (Queens)' },
  ]);
  const [selectedStore, setSelectedStore] = useState('all');

  // --- Section A: Active Live Conversation State ---
  const [activeConversation, setActiveConversation] = useState(null);
  const [socketConnected, setSocketConnected] = useState(false);

  // --- Section B: Completed Conversations State & Filters ---
  const [completedConversations, setCompletedConversations] = useState([]);
  const [totalCompleted, setTotalCompleted] = useState(0);
  const [completedLoading, setCompletedLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(''); // YYYY-MM-DD or empty
  const [sortOrder, setSortOrder] = useState('newest'); // 'newest' | 'oldest'
  const [salespersonFilter, setSalespersonFilter] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // --- AI Report Modal State ---
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [selectedReportSession, setSelectedReportSession] = useState(null);

  // Helper: Format duration seconds to MM:SS
  const formatDuration = (sec) => {
    if (!sec || isNaN(sec)) return '0m 00s';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}m ${s < 10 ? '0' : ''}${s}s`;
  };

  // Helper: Format date to local business string
  const formatDateTime = (dateStr) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // 1. Fetch Store List on mount
  useEffect(() => {
    fetch(`${BACKEND_URL}/api/stores/overview`, { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.stores) && data.stores.length > 0) {
          setStores([
            { id: 'all', code: 'ALL', name: 'All Retail Branches' },
            ...data.stores,
          ]);
        }
      })
      .catch((err) => console.warn('Could not fetch store overview:', err.message));
  }, []);

  // 2. Fetch Active Conversation on mount
  useEffect(() => {
    fetch(`${BACKEND_URL}/api/sessions?status=active&limit=1`, { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.sessions) && data.sessions.length > 0) {
          const s = data.sessions[0];
          const rawTranscripts = Array.isArray(s.transcripts) && s.transcripts.length > 0
            ? s.transcripts
            : (Array.isArray(s.transcript) ? s.transcript : []);

          setActiveConversation({
            id: s.sessionId || s._id,
            sessionId: s.sessionId,
            title: s.title || `Live Session - ${new Date(s.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
            storeName: s.storeName || 'iPhone Retail Branch',
            storeCode: s.storeCode,
            workstation: s.deviceId || 'Counter 01',
            salesRep: s.salesRep || 'Sales Specialist',
            startedAt: new Date(s.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isLive: true,
            status: 'active',
            transcript: rawTranscripts.map((t, idx) => {
              const isSales = t.speaker === 'sales_rep' || t.speaker === 'salesperson' || (t.speaker && String(t.speaker).toLowerCase().includes('sales'));
              return {
                id: t.segmentId || `seg-${idx}`,
                speaker: isSales ? 'Sales Specialist' : 'Customer',
                text: t.text || t.englishText || '',
                time: t.timestamp ? new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Live',
                isFinal: true,
              };
            }),
          });
        }
      })
      .catch((err) => console.warn('Active session fetch warning:', err.message));
  }, []);

  // 3. Fetch Completed Conversations (Section B) with Calendar Date, Sort, and Filters
  const fetchCompletedConversations = useCallback(async () => {
    setCompletedLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('status', 'completed');
      params.append('sort', sortOrder);
      params.append('page', page);
      params.append('limit', pageSize);
      params.append('tzOffset', new Date().getTimezoneOffset());

      if (selectedDate) {
        params.append('date', selectedDate);
      }
      if (selectedStore && selectedStore !== 'all') {
        params.append('store', selectedStore);
      }
      if (salespersonFilter.trim()) {
        params.append('salesperson', salespersonFilter.trim());
      }

      const res = await fetch(`${BACKEND_URL}/api/sessions?${params.toString()}`, {
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.sessions)) {
        setCompletedConversations(data.sessions);
        setTotalCompleted(data.total || data.sessions.length);
      } else {
        setCompletedConversations([]);
        setTotalCompleted(0);
      }
    } catch (err) {
      console.warn('Completed conversations fetch warning:', err.message);
      setCompletedConversations([]);
    } finally {
      setCompletedLoading(false);
    }
  }, [selectedDate, selectedStore, sortOrder, salespersonFilter, page]);

  useEffect(() => {
    fetchCompletedConversations();
  }, [fetchCompletedConversations]);

  // 4. Socket.IO Real-Time Stream Integration
  useEffect(() => {
    const authToken = token || localStorage.getItem('storelistener_token');
    const newSocket = io(BACKEND_URL, {
      ...DEFAULT_SOCKET_OPTIONS,
      auth: authToken ? { token: authToken } : undefined,
    });

    newSocket.on('connect', () => {
      setSocketConnected(true);
    });

    newSocket.on('disconnect', () => {
      setSocketConnected(false);
    });

    // Real-time Session Started
    newSocket.on('session_started', (payload) => {
      const newActive = {
        id: payload.sessionId,
        sessionId: payload.sessionId,
        title: payload.title || `Live Session - ${new Date(payload.startedAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
        storeName: payload.storeName || 'iPhone Retail Branch',
        storeCode: payload.storeCode,
        workstation: payload.deviceId || 'Counter 01',
        salesRep: payload.salesRep || 'Sales Specialist',
        startedAt: new Date(payload.startedAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isLive: true,
        status: 'active',
        transcript: [],
      };
      setActiveConversation(newActive);
    });

    // Real-time Live Transcript Chunks
    newSocket.on('transcript_stream_chunk', (chunk) => {
      const { sessionId, text, isFinal, timestamp, speaker } = chunk;

      setActiveConversation((prev) => {
        // If no active session or different session, initialize with this one
        const base = prev && prev.id === sessionId ? prev : {
          id: sessionId,
          sessionId,
          title: `Live Session - ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
          storeName: chunk.storeName || 'iPhone Retail Branch',
          storeCode: chunk.storeCode,
          workstation: 'Counter 01',
          salesRep: 'Sales Specialist',
          startedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isLive: true,
          status: 'active',
          transcript: [],
        };

        const formattedTime = timestamp
          ? new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
          : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

        const isSales = speaker === 'sales_rep' || speaker === 'salesperson' || (speaker && String(speaker).toLowerCase().includes('sales'));
        const speakerLabel = isSales ? 'Sales Specialist' : 'Customer';
        const currentTranscript = [...(base.transcript || [])];

        if (isFinal) {
          // Remove pending interim segment and append final segment
          const filtered = currentTranscript.filter((t) => t.isFinal !== false);
          filtered.push({
            id: chunk.segmentId || `final-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            speaker: speakerLabel,
            text,
            time: formattedTime,
            isFinal: true,
          });
          return { ...base, transcript: filtered };
        } else {
          // Update or append interim segment
          const lastIdx = currentTranscript.findIndex((t) => t.isFinal === false);
          if (lastIdx >= 0) {
            currentTranscript[lastIdx] = {
              ...currentTranscript[lastIdx],
              speaker: speakerLabel,
              text,
              time: formattedTime,
            };
          } else {
            currentTranscript.push({
              id: 'interim',
              speaker: speakerLabel,
              text,
              time: formattedTime,
              isFinal: false,
            });
          }
          return { ...base, transcript: currentTranscript };
        }
      });
    });

    // Real-time Session Ended (Manual close from Desktop app)
    newSocket.on('session_ended', (payload) => {
      // Clear active conversation if it matches
      setActiveConversation((prev) => {
        if (prev && (prev.id === payload.sessionId || prev.sessionId === payload.sessionId)) {
          return null; // Clean empty state for Section A
        }
        return prev;
      });

      // Immediately refresh Completed Conversations list
      fetchCompletedConversations();
    });

    // Real-time Deal Analysis Completed Update
    newSocket.on('deal_analysis_updated', (payload) => {
      setCompletedConversations((prev) =>
        prev.map((s) => {
          if (s.sessionId === payload.sessionId) {
            return {
              ...s,
              dealAnalysis: payload.dealAnalysis,
              scorecard: payload.scorecard || s.scorecard,
            };
          }
          return s;
        })
      );
    });

    return () => {
      newSocket.disconnect();
    };
  }, [token, fetchCompletedConversations]);

  // Calendar Day Stepper helpers
  const handleShiftDay = (deltaDays) => {
    const current = selectedDate ? new Date(selectedDate) : new Date();
    current.setDate(current.getDate() + deltaDays);
    const yyyy = current.getFullYear();
    const mm = String(current.getMonth() + 1).padStart(2, '0');
    const dd = String(current.getDate()).padStart(2, '0');
    setSelectedDate(`${yyyy}-${mm}-${dd}`);
    setPage(1);
  };

  const handleSelectToday = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    setSelectedDate(`${yyyy}-${mm}-${dd}`);
    setPage(1);
  };

  const handleClearDate = () => {
    setSelectedDate('');
    setPage(1);
  };

  // Open Full Conversation AI Report Modal
  const handleOpenReport = (session) => {
    setSelectedReportSession(session);
    setReportModalOpen(true);
  };

  return (
    <Box sx={{ maxWidth: 1440, mx: 'auto', pb: 6 }}>
      {/* Top Header Bar */}
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', md: 'center' }}
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Box>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>
              Live Store Monitoring & Conversation AI
            </Typography>
            <Chip
              size="small"
              icon={<LiveIcon sx={{ fontSize: '13px !important', color: socketConnected ? '#15803D !important' : '#DC2626 !important' }} />}
              label={socketConnected ? 'Live Connection Active' : 'Connecting to Server...'}
              sx={{
                height: 24,
                fontSize: '0.75rem',
                fontWeight: 700,
                bgcolor: socketConnected ? '#F0FDF4' : '#FEF2F2',
                color: socketConnected ? '#15803D' : '#B91C1C',
                borderColor: socketConnected ? '#BBF7D0' : '#FECACA',
                borderWidth: 1,
                borderStyle: 'solid',
              }}
            />
          </Stack>
          <Typography variant="body2" sx={{ color: '#64748B', mt: 0.5 }}>
            Real-time voice stream speech transcription and automated conversation intelligence reports.
          </Typography>
        </Box>

        <Stack direction="row" spacing={1.5} alignItems="center">
          {/* Store Filter Selector */}
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel id="store-select-label">Store Location</InputLabel>
            <Select
              labelId="store-select-label"
              value={selectedStore}
              label="Store Location"
              onChange={(e) => {
                setSelectedStore(e.target.value);
                setPage(1);
              }}
              sx={{ bgcolor: '#ffffff', borderRadius: 2 }}
            >
              {stores.map((s) => (
                <MenuItem key={s.id} value={s.id}>
                  {s.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* PDF Export */}
          <Button
            size="medium"
            variant="outlined"
            startIcon={<PdfIcon />}
            onClick={() => {
              try {
                downloadLiveMonitoringReport({
                  stores,
                  conversationsByStore: { [selectedStore]: completedConversations },
                  selectedStoreId: selectedStore,
                  currentUser,
                });
              } catch (err) {
                console.error('PDF export error:', err);
                alert('Failed to generate Live Monitoring PDF report.');
              }
            }}
            sx={{ fontWeight: 700, borderRadius: 2, textTransform: 'none' }}
          >
            Export PDF
          </Button>
        </Stack>
      </Stack>

      {/* ========================================================================= */}
      {/* SECTION A: LIVE TRANSCRIPT (ONLY ACTIVE CONVERSATION) */}
      {/* ========================================================================= */}
      <Box sx={{ mb: 4 }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#16A34A' }} />
          <Typography variant="h6" sx={{ fontWeight: 800, color: '#0F172A', letterSpacing: '-0.01em' }}>
            Section A: Live Active Transcript
          </Typography>
          {activeConversation && (
            <Chip
              label={`Active: #${activeConversation.id?.slice(-8) || activeConversation.id}`}
              size="small"
              sx={{ bgcolor: '#ECFDF5', color: '#047857', fontWeight: 700, fontSize: '0.75rem' }}
            />
          )}
        </Stack>

        <Paper
          variant="outlined"
          sx={{
            borderRadius: 3,
            overflow: 'hidden',
            borderColor: activeConversation ? '#86EFAC' : '#E2E8F0',
            boxShadow: activeConversation ? '0 8px 24px rgba(22, 163, 74, 0.08)' : 'none',
            minHeight: 280,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <TranscriptPanel conversation={activeConversation} />
        </Paper>
      </Box>

      {/* ========================================================================= */}
      {/* SECTION B: COMPLETED CONVERSATIONS & CALENDAR FILTER */}
      {/* ========================================================================= */}
      <Box>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'flex-start', md: 'center' }}
          spacing={2}
          sx={{ mb: 2 }}
        >
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, color: '#0F172A', letterSpacing: '-0.01em' }}>
              Section B: Completed Conversations
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748B' }}>
              Displaying finalized conversations saved to MongoDB ({totalCompleted} total sessions).
            </Typography>
          </Box>

          <Button
            size="small"
            startIcon={<RefreshIcon />}
            onClick={() => fetchCompletedConversations()}
            disabled={completedLoading}
            sx={{ fontWeight: 600, color: '#64748B' }}
          >
            Refresh List
          </Button>
        </Stack>

        {/* Calendar & Filter Toolbar */}
        <Paper
          variant="outlined"
          sx={{
            p: 2,
            mb: 2.5,
            borderRadius: 2.5,
            bgcolor: '#F8FAFC',
            borderColor: '#E2E8F0',
          }}
        >
          <Grid container spacing={2} alignItems="center">
            {/* Calendar Date Picker */}
            <Grid item xs={12} sm={6} md={3.5}>
              <Stack direction="row" spacing={0.5} alignItems="center">
                <Tooltip title="Previous Day">
                  <IconButton size="small" onClick={() => handleShiftDay(-1)}>
                    <PrevDayIcon sx={{ fontSize: 13 }} />
                  </IconButton>
                </Tooltip>

                <TextField
                  type="date"
                  size="small"
                  fullWidth
                  label="Filter by Date"
                  value={selectedDate}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    setPage(1);
                  }}
                  InputLabelProps={{ shrink: true }}
                  sx={{ bgcolor: '#ffffff', borderRadius: 1.5 }}
                />

                <Tooltip title="Next Day">
                  <IconButton size="small" onClick={() => handleShiftDay(1)}>
                    <NextDayIcon sx={{ fontSize: 13 }} />
                  </IconButton>
                </Tooltip>
              </Stack>
            </Grid>

            {/* Quick Date Actions: Today & Clear */}
            <Grid item xs={12} sm={6} md={2.5}>
              <Stack direction="row" spacing={1}>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<TodayIcon />}
                  onClick={handleSelectToday}
                  sx={{ fontWeight: 600, fontSize: '0.8rem', bgcolor: '#ffffff' }}
                >
                  Today
                </Button>
                {selectedDate && (
                  <Button
                    size="small"
                    variant="text"
                    color="secondary"
                    startIcon={<ClearIcon />}
                    onClick={handleClearDate}
                    sx={{ fontWeight: 600, fontSize: '0.8rem' }}
                  >
                    Clear Date
                  </Button>
                )}
              </Stack>
            </Grid>

            {/* Salesperson Filter */}
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                size="small"
                fullWidth
                placeholder="Search salesperson..."
                value={salespersonFilter}
                onChange={(e) => {
                  setSalespersonFilter(e.target.value);
                  setPage(1);
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" sx={{ color: '#94A3B8' }} />
                    </InputAdornment>
                  ),
                }}
                sx={{ bgcolor: '#ffffff', borderRadius: 1.5 }}
              />
            </Grid>

            {/* Sort Order Selector */}
            <Grid item xs={12} sm={6} md={3}>
              <FormControl size="small" fullWidth>
                <InputLabel id="sort-select-label">Sort Order</InputLabel>
                <Select
                  labelId="sort-select-label"
                  value={sortOrder}
                  label="Sort Order"
                  onChange={(e) => {
                    setSortOrder(e.target.value);
                    setPage(1);
                  }}
                  sx={{ bgcolor: '#ffffff', borderRadius: 1.5 }}
                >
                  <MenuItem value="newest">Newest First</MenuItem>
                  <MenuItem value="oldest">Oldest First</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Paper>

        {/* Completed Conversations Table */}
        <Paper
          variant="outlined"
          sx={{
            borderRadius: 3,
            overflow: 'hidden',
            borderColor: '#E2E8F0',
          }}
        >
          <TableContainer>
            <Table sx={{ minWidth: 800 }}>
              <TableHead sx={{ bgcolor: '#F8FAFC' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, color: '#475569', fontSize: '0.8rem' }}>
                    Date & Start Time
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#475569', fontSize: '0.8rem' }}>
                    Duration
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#475569', fontSize: '0.8rem' }}>
                    Store & Branch
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#475569', fontSize: '0.8rem' }}>
                    Salesperson
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#475569', fontSize: '0.8rem' }}>
                    Transcript Preview
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#475569', fontSize: '0.8rem' }} align="center">
                    AI Report Status
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#475569', fontSize: '0.8rem' }} align="right">
                    Action
                  </TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {completedLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} sx={{ py: 6, textAlign: 'center' }}>
                      <CircularProgress size={32} />
                      <Typography variant="body2" sx={{ color: '#64748B', mt: 1.5 }}>
                        Loading completed conversations...
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : completedConversations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} sx={{ py: 6, textAlign: 'center' }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0F172A' }}>
                        No completed conversations found
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#64748B', display: 'block', mt: 0.5 }}>
                        {selectedDate
                          ? `No recorded sessions on ${selectedDate}. Try clearing the date filter.`
                          : 'Finalized sessions will appear here once saved from the counter terminal.'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  completedConversations.map((session) => {
                    const sId = session.sessionId || session._id;
                    const transcripts = Array.isArray(session.transcripts) ? session.transcripts : [];
                    const previewText = transcripts.length > 0
                      ? transcripts.slice(0, 2).map((t) => t.text).join(' ')
                      : 'No dialogue recorded.';

                    const statusKey = session.dealAnalysis?.analysisStatus || (session.analytics ? 'completed' : 'pending');
                    const statusConfig = AI_STATUS_CONFIG[statusKey] || AI_STATUS_CONFIG.pending;
                    const StatusIcon = statusConfig.icon;

                    return (
                      <TableRow
                        key={sId}
                        hover
                        sx={{
                          '&:last-child td, &:last-child th': { border: 0 },
                          transition: 'background-color 0.15s ease',
                        }}
                      >
                        {/* Date & Start Time */}
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 700, color: '#0F172A' }}>
                            {formatDateTime(session.startedAt)}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#94A3B8' }}>
                            #{sId.slice(-8)}
                          </Typography>
                        </TableCell>

                        {/* Duration */}
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: '#334155' }}>
                            {formatDuration(session.durationSeconds)}
                          </Typography>
                        </TableCell>

                        {/* Store & Branch */}
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600, color: '#0F172A' }}>
                            {session.storeName || session.storeCode || 'iPhone Store'}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#64748B' }}>
                            {session.storeCode || 'STORE-01'}
                          </Typography>
                        </TableCell>

                        {/* Salesperson */}
                        <TableCell>
                          <Stack direction="row" spacing={0.75} alignItems="center">
                            <RepIcon sx={{ fontSize: 16, color: '#64748B' }} />
                            <Typography variant="body2" sx={{ fontWeight: 600, color: '#334155' }}>
                              {session.salesRep || 'Sales Specialist'}
                            </Typography>
                          </Stack>
                        </TableCell>

                        {/* Transcript Preview */}
                        <TableCell sx={{ maxWidth: 320 }}>
                          <Typography
                            variant="body2"
                            sx={{
                              color: '#475569',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              lineHeight: 1.4,
                            }}
                          >
                            {previewText}
                          </Typography>
                        </TableCell>

                        {/* AI Status Badge */}
                        <TableCell align="center">
                          <Chip
                            icon={<StatusIcon sx={{ fontSize: '13px !important', color: `${statusConfig.color} !important` }} />}
                            label={statusConfig.label}
                            size="small"
                            sx={{
                              fontWeight: 700,
                              fontSize: '0.72rem',
                              bgcolor: statusConfig.bgcolor,
                              color: statusConfig.color,
                              borderColor: statusConfig.borderColor,
                              borderWidth: 1,
                              borderStyle: 'solid',
                            }}
                          />
                        </TableCell>

                        {/* View Report Action */}
                        <TableCell align="right">
                          <Button
                            size="small"
                            variant="contained"
                            startIcon={<ViewReportIcon />}
                            onClick={() => handleOpenReport(session)}
                            sx={{
                              fontWeight: 700,
                              fontSize: '0.75rem',
                              textTransform: 'none',
                              bgcolor: '#0F172A',
                              '&:hover': { bgcolor: '#1E293B' },
                            }}
                          >
                            View Report
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Pagination Footer */}
          {totalCompleted > pageSize && (
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              sx={{ p: 2, px: 3, borderTop: '1px solid #E2E8F0', bgcolor: '#F8FAFC' }}
            >
              <Typography variant="caption" sx={{ color: '#64748B' }}>
                Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, totalCompleted)} of {totalCompleted} completed sessions
              </Typography>
              <Pagination
                count={Math.ceil(totalCompleted / pageSize)}
                page={page}
                onChange={(e, val) => setPage(val)}
                color="primary"
                size="small"
              />
            </Stack>
          )}
        </Paper>
      </Box>

      {/* ========================================================================= */}
      {/* 9-SECTION CONVERSATION AI REPORT MODAL */}
      {/* ========================================================================= */}
      <ConversationReportModal
        open={reportModalOpen}
        conversation={selectedReportSession}
        onClose={() => {
          setReportModalOpen(false);
          setSelectedReportSession(null);
        }}
        currentUser={currentUser}
      />
    </Box>
  );
}
