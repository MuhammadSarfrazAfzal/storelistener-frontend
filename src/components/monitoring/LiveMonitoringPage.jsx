import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import {
  Box,
  Typography,
  Grid,
  Stack,
  Alert,
  Chip,
  Button,
} from '@mui/material';
import {
  Sensors as LiveIcon,
  PictureAsPdf as PdfIcon,
} from '@mui/icons-material';

import { downloadLiveMonitoringReport } from '../../utils/pdfReportService';

import StoreSelector from './StoreSelector';
import ActiveConversationList from './ActiveConversationList';
import TranscriptPanel from './TranscriptPanel';
import AudioMonitoringPanel from './AudioMonitoringPanel';
import ConversationDetails from './ConversationDetails';

import {
  MONITORING_STORES,
} from '../../data/mockLiveMonitoringData';

import { BACKEND_URL, DEFAULT_SOCKET_OPTIONS } from '../../config/api';

export default function LiveMonitoringPage({ currentUser, token }) {
  const [stores, setStores] = useState(MONITORING_STORES);
  const [selectedStoreId, setSelectedStoreId] = useState('store-01');
  const [selectedConversationId, setSelectedConversationId] = useState(null);
  const [conversationsByStore, setConversationsByStore] = useState({
    'store-01': [],
    'store-02': [],
    'store-03': [],
  });
  const [socket, setSocket] = useState(null);
  const [socketConnected, setSocketConnected] = useState(false);

  // Fetch store statuses and recent/active sessions from backend
  const fetchLiveState = async () => {
    try {
      const [storesRes, sessionsRes] = await Promise.all([
        fetch(`${BACKEND_URL}/api/stores/overview`, { credentials: 'include' }),
        fetch(`${BACKEND_URL}/api/sessions?limit=30`, { credentials: 'include' }),
      ]);

      const storesData = await storesRes.json();
      if (storesData.success && Array.isArray(storesData.stores)) {
        setStores(storesData.stores);
      }

      const sessionsData = await sessionsRes.json();
      if (sessionsData.success && Array.isArray(sessionsData.sessions)) {
        const byStore = { 'store-01': [], 'store-02': [], 'store-03': [] };

        sessionsData.sessions.forEach((s) => {
          const code = (s.storeCode || s.storeId || '').toLowerCase();
          const sId = code.includes('02') ? 'store-02' : code.includes('03') ? 'store-03' : 'store-01';

          const rawTranscripts = Array.isArray(s.transcripts) && s.transcripts.length > 0
            ? s.transcripts
            : (Array.isArray(s.transcript) ? s.transcript : []);

          byStore[sId].push({
            id: s.sessionId || s._id,
            title: s.title || `Live Session - ${new Date(s.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
            storeName: s.storeName || (sId === 'store-02' ? 'iPhone Store 02' : sId === 'store-03' ? 'iPhone Store 03' : 'iPhone Store 01'),
            workstation: s.workstation || 'Counter 01',
            salesRep: s.salesRep || 'Sales Specialist',
            startedAt: new Date(s.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            elapsedSimulated: s.status === 'active' ? 'Active' : (s.durationSeconds ? `${Math.floor(s.durationSeconds / 60)}m ${s.durationSeconds % 60}s` : 'Completed'),
            dealStatus: s.analytics?.dealOutcome === 'won' ? 'Closed' : s.analytics?.dealOutcome === 'lost' ? 'Not Closed' : 'Pending',
            isLive: s.status === 'active',
            status: s.status || 'completed',
            notes: 'Counter conversation record.',
            transcript: rawTranscripts.map((t, idx) => {
              const isSales = t.speaker === 'sales_rep' || t.speaker === 'salesperson' || (t.speaker && String(t.speaker).toLowerCase().includes('sales'));
              return {
                id: t.segmentId || `trans-${idx}`,
                speaker: isSales ? 'Sales Specialist' : 'Customer',
                text: t.text || t.englishText || '',
                time: t.timestamp ? new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Live',
                isFinal: true,
              };
            }),
          });
        });

        setConversationsByStore(byStore);

        // Auto-select first active or available conversation
        const currentStoreConvs = byStore[selectedStoreId] || [];
        if (currentStoreConvs.length > 0 && !selectedConversationId) {
          setSelectedConversationId(currentStoreConvs[0].id);
        }
      }
    } catch (err) {
      console.warn('Live monitoring state fetch warning:', err.message);
    }
  };

  useEffect(() => {
    fetchLiveState();

    const authToken = token || localStorage.getItem('storelistener_token');
    const newSocket = io(BACKEND_URL, {
      ...DEFAULT_SOCKET_OPTIONS,
      auth: authToken ? { token: authToken } : undefined,
    });

    setSocket(newSocket);

    newSocket.on('connect', () => {
      setSocketConnected(true);
    });

    newSocket.on('disconnect', () => {
      setSocketConnected(false);
    });

    // Real-time store statuses
    newSocket.on('stores_overview_update', (data) => {
      if (Array.isArray(data)) {
        setStores(data);
      } else if (data && data.stores) {
        setStores(data.stores);
      }
    });

    // Real-time session started from desktop app
    newSocket.on('session_started', (payload) => {
      const code = (payload.storeCode || payload.storeId || '').toLowerCase();
      const storeKey = code.includes('02') ? 'store-02' : code.includes('03') ? 'store-03' : 'store-01';

      const newConv = {
        id: payload.sessionId,
        title: payload.title || `Conversation - ${new Date(payload.startedAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
        storeName: payload.storeName || (storeKey === 'store-02' ? 'iPhone Store 02' : storeKey === 'store-03' ? 'iPhone Store 03' : 'iPhone Store 01'),
        workstation: payload.workstation || 'Counter 01',
        salesRep: payload.salesRep || 'Sales Specialist',
        startedAt: new Date(payload.startedAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        elapsedSimulated: 'Active',
        dealStatus: payload.dealStatus || 'Pending',
        isLive: true,
        status: 'active',
        notes: 'Voice-activated conversation streaming live.',
        transcript: [],
      };

      setConversationsByStore((prev) => {
        const currentList = prev[storeKey] || [];
        if (currentList.some((c) => c.id === payload.sessionId)) {
          return {
            ...prev,
            [storeKey]: currentList.map((c) => (c.id === payload.sessionId ? { ...c, isLive: true, status: 'active' } : c)),
          };
        }
        return {
          ...prev,
          [storeKey]: [newConv, ...currentList],
        };
      });

      setSelectedConversationId(payload.sessionId);
      setSelectedStoreId(storeKey);
    });

    // Real-time transcript chunk from speech recognition
    newSocket.on('transcript_stream_chunk', (chunk) => {
      const { sessionId, storeId, storeCode, text, isFinal, timestamp, speaker } = chunk;

      setConversationsByStore((prev) => {
        // 1. Resolve which store this session belongs to
        let targetStoreKey = null;
        for (const [k, list] of Object.entries(prev)) {
          if (list.some((c) => c.id === sessionId)) {
            targetStoreKey = k;
            break;
          }
        }

        if (!targetStoreKey) {
          const code = (storeCode || storeId || '').toLowerCase();
          targetStoreKey = code.includes('02') ? 'store-02' : code.includes('03') ? 'store-03' : 'store-01';
        }

        const storeList = prev[targetStoreKey] || [];
        const convIndex = storeList.findIndex((c) => c.id === sessionId);

        let conv;
        let isNewConv = false;
        if (convIndex >= 0) {
          conv = { ...storeList[convIndex] };
        } else {
          conv = {
            id: sessionId,
            title: `Live Session - ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
            storeName: chunk.storeName || (targetStoreKey === 'store-02' ? 'iPhone Store 02' : targetStoreKey === 'store-03' ? 'iPhone Store 03' : 'iPhone Store 01'),
            workstation: 'Counter 01',
            salesRep: 'Sales Specialist',
            startedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            elapsedSimulated: 'Active',
            dealStatus: 'Pending',
            isLive: true,
            status: 'active',
            transcript: [],
          };
          isNewConv = true;
        }

        const formattedTime = timestamp
          ? new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
          : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

        const isSales = speaker === 'sales_rep' || speaker === 'salesperson' || (speaker && String(speaker).toLowerCase().includes('sales'));
        const speakerLabel = isSales ? 'Sales Specialist' : 'Customer';
        const currentTranscript = [...(conv.transcript || [])];

        if (isFinal) {
          // Remove any pending interim line and append confirmed final segment
          const filtered = currentTranscript.filter((t) => t.isFinal !== false);
          filtered.push({
            id: chunk.segmentId || `final-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            speaker: speakerLabel,
            text: text,
            time: formattedTime,
            isFinal: true,
          });
          conv.transcript = filtered;
        } else {
          // Update or add interim line
          const lastIndex = currentTranscript.findIndex((t) => t.isFinal === false);
          if (lastIndex >= 0) {
            currentTranscript[lastIndex] = {
              ...currentTranscript[lastIndex],
              speaker: speakerLabel,
              text: text,
              time: formattedTime,
            };
          } else {
            currentTranscript.push({
              id: 'interim',
              speaker: speakerLabel,
              text: text,
              time: formattedTime,
              isFinal: false,
            });
          }
          conv.transcript = currentTranscript;
        }

        const updatedList = isNewConv
          ? [conv, ...storeList]
          : storeList.map((c, i) => (i === convIndex ? conv : c));

        return {
          ...prev,
          [targetStoreKey]: updatedList,
        };
      });

      setSelectedConversationId((prevId) => prevId || sessionId);
    });

    // Real-time session closure (manual save & close or completion)
    newSocket.on('session_ended', (payload) => {
      setConversationsByStore((prev) => {
        let targetStoreKey = null;
        for (const [k, list] of Object.entries(prev)) {
          if (list.some((c) => c.id === payload.sessionId)) {
            targetStoreKey = k;
            break;
          }
        }

        if (!targetStoreKey) {
          const code = (payload.storeCode || payload.storeId || '').toLowerCase();
          targetStoreKey = code.includes('02') ? 'store-02' : code.includes('03') ? 'store-03' : 'store-01';
        }

        const storeList = prev[targetStoreKey] || [];
        return {
          ...prev,
          [targetStoreKey]: storeList.map((c) => {
            if (c.id === payload.sessionId) {
              return {
                ...c,
                isLive: false,
                status: 'completed',
                elapsedSimulated: payload.durationSeconds
                  ? `${Math.floor(payload.durationSeconds / 60)}m ${payload.durationSeconds % 60}s`
                  : c.elapsedSimulated,
              };
            }
            return c;
          }),
        };
      });
    });

    return () => {
      newSocket.disconnect();
    };
  }, [token]);

  // Handle store selection
  const handleSelectStore = (storeId) => {
    setSelectedStoreId(storeId);
    const storeConversations = conversationsByStore[storeId] || [];
    setSelectedConversationId(storeConversations.length > 0 ? storeConversations[0].id : null);
  };

  // Get active conversations for selected store
  const activeConversations = conversationsByStore[selectedStoreId] || [];
  const selectedStore = stores.find((s) => s.id === selectedStoreId) || {
    id: selectedStoreId,
    name: selectedStoreId === 'store-02' ? 'iPhone Store 02' : selectedStoreId === 'store-03' ? 'iPhone Store 03' : 'iPhone Store 01',
  };

  // Current selected conversation
  const currentConversation =
    activeConversations.find((c) => c.id === selectedConversationId) ||
    activeConversations[0] ||
    null;

  return (
    <Box sx={{ maxWidth: 1440, mx: 'auto' }}>
      {/* Page Header */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        spacing={2}
        sx={{ mb: 2.5 }}
      >
        <Box>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary', letterSpacing: '-0.02em' }}>
              Live Store Monitoring
            </Typography>
            <Chip
              size="small"
              icon={<LiveIcon sx={{ fontSize: '13px !important', color: socketConnected ? '#16A34A !important' : '#DC2626 !important' }} />}
              label={socketConnected ? 'Live Feed Connected' : 'Reconnecting...'}
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
            Inspect counter activity, recognized speech, and session status across iPhone store branches in real time.
          </Typography>
        </Box>

        <Button
          size="small"
          variant="outlined"
          startIcon={<PdfIcon />}
          onClick={() => {
            try {
              downloadLiveMonitoringReport({
                stores,
                conversationsByStore,
                selectedStoreId,
                currentUser,
              });
            } catch (err) {
              console.error('PDF export error:', err);
              alert('Failed to generate Live Monitoring PDF report.');
            }
          }}
          sx={{ fontWeight: 600, fontSize: '0.8125rem', whiteSpace: 'nowrap' }}
        >
          Download PDF
        </Button>
      </Stack>

      {/* Module 5 Live Synchronization Banner */}
      <Alert
        severity="success"
        icon={<LiveIcon fontSize="small" />}
        sx={{
          mb: 3,
          borderRadius: 2,
          py: 0.75,
          px: 2,
          fontSize: '0.8125rem',
        }}
      >
        <strong>Module 5 Live Channel: </strong>
        Desktop sessions, English speech transcripts, and low-latency audio streams broadcast directly to this dashboard without page reload.
      </Alert>

      {/* Three-Panel Desktop Workspace Layout */}
      <Grid container spacing={2.5}>
        {/* Panel 1: Store & Active Conversation Selector (Left) */}
        <Grid item xs={12} lg={3.5}>
          <Stack spacing={2.5}>
            <StoreSelector
              stores={stores}
              selectedStoreId={selectedStoreId}
              onSelectStore={handleSelectStore}
            />

            <ActiveConversationList
              conversations={activeConversations}
              selectedConversationId={currentConversation?.id}
              onSelectConversation={(id) => setSelectedConversationId(id)}
              storeName={selectedStore ? selectedStore.name : 'Selected Store'}
            />
          </Stack>
        </Grid>

        {/* Panel 2: Transcript Viewer (Center) */}
        <Grid item xs={12} md={7} lg={5}>
          <TranscriptPanel conversation={currentConversation} />
        </Grid>

        {/* Panel 3: Audio Feed & Details (Right) */}
        <Grid item xs={12} md={5} lg={3.5}>
          <Stack spacing={2.5}>
            <AudioMonitoringPanel
              conversation={currentConversation}
              socket={socket}
              token={token}
            />
            <ConversationDetails conversation={currentConversation} />
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
}
