/**
 * Storelistener — Transcript Panel Component for Live Monitoring
 * File: src/components/monitoring/TranscriptPanel.jsx
 */

import { useEffect, useRef } from 'react';
import {
  Card,
  CardHeader,
  CardContent,
  Typography,
  Stack,
  Box,
  Chip,
  Paper,
  Divider,
} from '@mui/material';
import {
  PersonOutline as CustomerIcon,
  SupportAgentOutlined as SalespersonIcon,
  Sensors as LiveIcon,
  DataObjectOutlined as SimulatedIcon,
  RecordVoiceOverOutlined as EmptyTranscriptIcon,
} from '@mui/icons-material';

export default function TranscriptPanel({ conversation }) {
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [conversation?.transcript]);

  if (!conversation) {
    return (
      <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <CardHeader
          title={
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              Live Transcript
            </Typography>
          }
          subheader={
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.25 }}>
              Select an active conversation to inspect recognized dialogue
            </Typography>
          }
          sx={{ p: 2, pb: 1.5 }}
        />
        <Divider />
        <CardContent sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', p: 4 }}>
          <Box sx={{ textAlign: 'center' }}>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                bgcolor: '#F8FAFC',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'text.disabled',
                mb: 1.5,
              }}
            >
              <EmptyTranscriptIcon />
            </Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.primary' }}>
              No conversation selected
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', mt: 0.5, display: 'block' }}>
              Choose a store and active conversation session from the left panel.
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  const { title, storeName, workstation, transcript = [], isLive = false, status = 'active' } = conversation;
  const isSessionActive = isLive || status === 'active';

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Panel Header */}
      <CardHeader
        title={
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ sm: 'center' }} spacing={1}>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
                {title}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.25 }}>
                {storeName} • {workstation}
              </Typography>
            </Box>

            {/* Live Status Badge */}
            {isSessionActive ? (
              <Chip
                size="small"
                icon={<LiveIcon sx={{ fontSize: '13px !important', color: '#16A34A !important' }} />}
                label="LIVE ENGLISH TRANSCRIPT"
                sx={{
                  height: 22,
                  fontSize: '0.6875rem',
                  fontWeight: 700,
                  bgcolor: '#F0FDF4',
                  color: '#15803D',
                  borderColor: '#86EFAC',
                  borderWidth: 1,
                  borderStyle: 'solid',
                  alignSelf: { xs: 'flex-start', sm: 'center' },
                  animation: 'pulse 1.8s infinite',
                  '@keyframes pulse': {
                    '0%': { opacity: 1 },
                    '50%': { opacity: 0.75 },
                    '100%': { opacity: 1 },
                  },
                }}
              />
            ) : (
              <Chip
                size="small"
                icon={<SimulatedIcon sx={{ fontSize: '12px !important', color: '#64748B !important' }} />}
                label="Finalized Session Transcript"
                sx={{
                  height: 22,
                  fontSize: '0.6875rem',
                  fontWeight: 600,
                  bgcolor: '#F8FAFC',
                  color: '#475569',
                  borderColor: '#CBD5E1',
                  borderWidth: 1,
                  borderStyle: 'solid',
                  alignSelf: { xs: 'flex-start', sm: 'center' },
                }}
              />
            )}
          </Stack>
        }
        sx={{ p: 2, pb: 1.5 }}
      />
      <Divider />

      {/* Transcript Exchanges List */}
      <CardContent
        ref={scrollRef}
        sx={{
          p: 2,
          flex: 1,
          overflowY: 'auto',
          maxHeight: { xs: 450, md: 'calc(100vh - 300px)' },
        }}
      >
        {transcript.length === 0 ? (
          <Box sx={{ py: 6, textAlign: 'center' }}>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {isSessionActive
                ? 'Listening for voice activity... Transcribed English sentences will appear here in real time.'
                : 'No transcript recorded for this conversation.'}
            </Typography>
          </Box>
        ) : (
          <Stack spacing={1.75}>
            {transcript.map((line, idx) => {
              const isSalesperson = line.speaker === 'Salesperson' || line.speaker === 'Employee';
              const isInterim = line.isFinal === false;

              return (
                <Paper
                  key={line.id || `line-${idx}`}
                  variant="outlined"
                  sx={{
                    p: 2,
                    borderRadius: 1.5,
                    bgcolor: isInterim ? '#FFFBEB' : isSalesperson ? '#F8FAFC' : '#FFFFFF',
                    borderColor: isInterim ? '#FCD34D' : isSalesperson ? '#E2E8F0' : '#CBD5E1',
                    borderStyle: isInterim ? 'dashed' : 'solid',
                    transition: 'all 150ms ease',
                  }}
                >
                  {/* Speaker Header */}
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.75 }}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Box
                        sx={{
                          width: 24,
                          height: 24,
                          borderRadius: 1,
                          bgcolor: isSalesperson ? '#EFF6FF' : '#F1F5F9',
                          color: isSalesperson ? 'secondary.main' : 'text.secondary',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {isSalesperson ? <SalespersonIcon sx={{ fontSize: 15 }} /> : <CustomerIcon sx={{ fontSize: 15 }} />}
                      </Box>
                      <Typography
                        variant="caption"
                        sx={{
                          fontWeight: 700,
                          color: isSalesperson ? 'secondary.dark' : 'text.primary',
                          fontSize: '0.75rem',
                        }}
                      >
                        {line.speaker || 'Customer'}
                      </Typography>
                      {isInterim && (
                        <Chip
                          size="small"
                          label="transcribing..."
                          sx={{ height: 16, fontSize: '0.625rem', bgcolor: '#FEF3C7', color: '#92400E' }}
                        />
                      )}
                    </Stack>

                    <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.6875rem', fontFamily: 'monospace' }}>
                      {line.time || 'Live'}
                    </Typography>
                  </Stack>

                  {/* Speech Text */}
                  <Typography
                    variant="body2"
                    sx={{
                      color: isInterim ? 'text.secondary' : 'text.primary',
                      fontStyle: isInterim ? 'italic' : 'normal',
                      lineHeight: 1.55,
                      pl: 4,
                    }}
                  >
                    {line.text}
                  </Typography>
                </Paper>
              );
            })}
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}
