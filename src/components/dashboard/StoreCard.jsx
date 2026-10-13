/**
 * Storelistener — Reusable StoreCard Component
 * File: src/components/dashboard/StoreCard.jsx
 */


import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Stack,
  Box,
  Chip,
  Button,
} from '@mui/material';
import {
  Storefront as StoreIcon,
  FiberManualRecord as DotIcon,
  ChevronRight as ArrowIcon,
  Sensors as SensorsIcon,
  Mic as MicIcon,
  Hearing as HearingIcon,
  DesktopWindows as DesktopIcon,
} from '@mui/icons-material';

export default function StoreCard({ store, onAction }) {
  if (!store) return null;

  const {
    name,
    code,
    status = 'Offline',
    currentState = 'Offline',
    appConnected = false,
    activeConversations = 0,
    workstationsCount = 0,
    activeSession = null,
    lastHeartbeat = null,
  } = store;

  // Live timer for active recording session
  const [sessionDuration, setSessionDuration] = useState(() => {
    if (activeSession?.startedAt) {
      return Math.max(0, Math.floor((Date.now() - new Date(activeSession.startedAt).getTime()) / 1000));
    }
    return activeSession?.durationSeconds || 0;
  });

  useEffect(() => {
    if (currentState === 'Recording' && activeSession?.startedAt) {
      const interval = setInterval(() => {
        const sec = Math.max(0, Math.floor((Date.now() - new Date(activeSession.startedAt).getTime()) / 1000));
        setSessionDuration(sec);
      }, 1000);
      return () => clearInterval(interval);
    } else {
      setSessionDuration(activeSession?.durationSeconds || 0);
    }
  }, [currentState, activeSession]);

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatLastHeartbeat = () => {
    if (!lastHeartbeat) return 'No signal';
    const diffSec = Math.floor((Date.now() - new Date(lastHeartbeat).getTime()) / 1000);
    if (diffSec < 5) return 'Active now';
    if (diffSec < 60) return `${diffSec}s ago`;
    return `${Math.floor(diffSec / 60)}m ago`;
  };

  // Determine status color and label
  const isOnline = status === 'Online' || currentState !== 'Offline';

  const getStatusConfig = () => {
    if (isOnline) {
      return {
        label: 'Online',
        dotColor: '#16A34A',
        bgColor: '#F0FDF4',
        borderColor: '#BBF7D0',
      };
    }
    return {
      label: 'Offline',
      dotColor: '#DC2626',
      bgColor: '#FEF2F2',
      borderColor: '#FECACA',
    };
  };

  // State Chip configuration: Idle, Listening, Recording, Offline
  const getStateChip = () => {
    switch (currentState) {
      case 'Recording':
        return (
          <Chip
            size="small"
            icon={<MicIcon sx={{ fontSize: '12px !important', color: '#DC2626 !important' }} />}
            label={`Recording (${formatDuration(sessionDuration)})`}
            sx={{
              height: 22,
              fontSize: '0.6875rem',
              fontWeight: 700,
              bgcolor: '#FEF2F2',
              borderColor: '#F87171',
              borderWidth: 1,
              borderStyle: 'solid',
              color: '#B91C1C',
              animation: 'pulse 1.5s infinite',
              '@keyframes pulse': {
                '0%': { opacity: 1 },
                '50%': { opacity: 0.7 },
                '100%': { opacity: 1 },
              },
            }}
          />
        );
      case 'Listening':
        return (
          <Chip
            size="small"
            icon={<HearingIcon sx={{ fontSize: '12px !important', color: '#16A34A !important' }} />}
            label="Listening"
            sx={{
              height: 22,
              fontSize: '0.6875rem',
              fontWeight: 600,
              bgcolor: '#F0FDF4',
              borderColor: '#86EFAC',
              borderWidth: 1,
              borderStyle: 'solid',
              color: '#15803D',
            }}
          />
        );
      case 'Idle':
        return (
          <Chip
            size="small"
            icon={<SensorsIcon sx={{ fontSize: '12px !important', color: '#2563EB !important' }} />}
            label="Idle"
            sx={{
              height: 22,
              fontSize: '0.6875rem',
              fontWeight: 600,
              bgcolor: '#EFF6FF',
              borderColor: '#BFDBFE',
              borderWidth: 1,
              borderStyle: 'solid',
              color: '#1D4ED8',
            }}
          />
        );
      default:
        return (
          <Chip
            size="small"
            label="Offline"
            sx={{
              height: 22,
              fontSize: '0.6875rem',
              fontWeight: 600,
              bgcolor: '#F1F5F9',
              borderColor: '#CBD5E1',
              borderWidth: 1,
              borderStyle: 'solid',
              color: '#64748B',
            }}
          />
        );
    }
  };

  const statusConfig = getStatusConfig();

  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        transition: 'border-color 150ms ease, box-shadow 150ms ease',
        '&:hover': {
          borderColor: '#CBD5E1',
        },
      }}
    >
      <CardContent sx={{ p: 2.5 }}>
        {/* Header: Store Icon, Name & Status Badge */}
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1.5} sx={{ mb: 1.5 }}>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Box
              sx={{
                width: 38,
                height: 38,
                borderRadius: 1.5,
                bgcolor: '#F1F5F9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'text.primary',
                flexShrink: 0,
              }}
            >
              <StoreIcon sx={{ fontSize: 22 }} />
            </Box>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
                {name}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'monospace' }}>
                {code}
              </Typography>
            </Box>
          </Stack>

          {/* Accessible Status Indicator */}
          <Chip
            size="small"
            icon={<DotIcon sx={{ fontSize: '10px !important', color: `${statusConfig.dotColor} !important` }} />}
            label={statusConfig.label}
            sx={{
              height: 22,
              fontSize: '0.6875rem',
              fontWeight: 600,
              bgcolor: statusConfig.bgColor,
              borderColor: statusConfig.borderColor,
              borderWidth: 1,
              borderStyle: 'solid',
              color: 'text.primary',
            }}
          />
        </Stack>

        {/* State & Connectivity Row */}
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
          {getStateChip()}
          <Stack direction="row" spacing={0.5} alignItems="center">
            <DesktopIcon sx={{ fontSize: 13, color: (appConnected || isOnline) ? '#16A34A' : '#94A3B8' }} />
            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.75rem', fontWeight: 500 }}>
              {(appConnected || isOnline) ? 'App Connected' : 'App Offline'}
            </Typography>
          </Stack>
        </Stack>

        {/* Store Metrics */}
        <Box sx={{ pt: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.8125rem' }}>
              Active Conversations
            </Typography>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: activeConversations > 0 ? 'secondary.main' : 'text.secondary' }}>
              {activeConversations}
            </Typography>
          </Stack>

          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 0.75 }}>
            <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.8125rem' }}>
              Last Heartbeat
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 600, color: isOnline ? 'success.main' : 'text.disabled' }}>
              {formatLastHeartbeat()}
            </Typography>
          </Stack>

          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 0.75 }}>
            <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.8125rem' }}>
              Registered Terminals
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.primary' }}>
              {workstationsCount}
            </Typography>
          </Stack>
        </Box>
      </CardContent>

      <CardActions sx={{ p: 2, pt: 0, borderTop: 'none' }}>
        <Button
          fullWidth
          size="small"
          variant="outlined"
          onClick={() => onAction && onAction(store)}
          endIcon={<ArrowIcon sx={{ fontSize: 16 }} />}
          sx={{
            justifyContent: 'space-between',
            borderColor: 'divider',
            color: 'text.primary',
            fontSize: '0.8125rem',
            '&:hover': {
              borderColor: 'secondary.main',
              bgcolor: '#F8FAFC',
            },
          }}
        >
          {isOnline ? 'Monitor Store' : 'View Store'}
        </Button>
      </CardActions>
    </Card>
  );
}
