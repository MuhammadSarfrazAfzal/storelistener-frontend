/**
 * Storelistener — Transcript Panel Component for Live Monitoring
 * File: src/components/monitoring/TranscriptPanel.jsx
 *
 * Implements:
 * 1. Natural paragraph formatting: groups speech segments into cohesive, readable paragraphs.
 * 2. Animated listening indicator (pulsing dots) when waiting for speech.
 * 3. Clear "Transcribing..." state when active speech is recognized.
 * 4. Silence handling: pauses return to "Listening..." without clearing transcript or closing conversation.
 * 5. Smooth in-line interim speech display.
 */

import { useEffect, useRef, useMemo } from 'react';
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
  GraphicEq as TranscribingIcon,
  RecordVoiceOverOutlined as EmptyTranscriptIcon,
} from '@mui/icons-material';

import { formatIntoParagraphs } from '../../utils/paragraphFormatter';

export default function TranscriptPanel({ conversation }) {
  const scrollRef = useRef(null);

  // Group raw segments into natural paragraphs
  const rawSegments = conversation?.transcript || [];
  const interimItem = rawSegments.find((t) => t.isFinal === false);
  const interimText = interimItem ? interimItem.text : '';
  const finalSegments = rawSegments.filter((t) => t.isFinal !== false);

  const paragraphs = useMemo(() => {
    return formatIntoParagraphs(finalSegments, interimText, interimItem?.speaker || 'Customer');
  }, [finalSegments, interimText, interimItem?.speaker]);

  const hasInterim = Boolean(interimText && interimText.trim());

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [paragraphs, interimText]);

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

  const { title, storeName, workstation, isLive = false, status = 'active' } = conversation;
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

            {/* Dynamic Live Status Badge */}
            {isSessionActive ? (
              hasInterim ? (
                <Chip
                  size="small"
                  icon={
                    <TranscribingIcon
                      sx={{
                        fontSize: '13px !important',
                        color: '#2563EB !important',
                        animation: 'transcribingPulse 0.9s infinite ease-in-out',
                        '@keyframes transcribingPulse': {
                          '0%': { transform: 'scale(1)' },
                          '50%': { transform: 'scale(1.25)' },
                          '100%': { transform: 'scale(1)' },
                        },
                      }}
                    />
                  }
                  label="Transcribing..."
                  sx={{
                    height: 24,
                    fontSize: '0.71875rem',
                    fontWeight: 700,
                    bgcolor: '#EFF6FF',
                    color: '#1D4ED8',
                    borderColor: '#93C5FD',
                    borderWidth: 1,
                    borderStyle: 'solid',
                    alignSelf: { xs: 'flex-start', sm: 'center' },
                    boxShadow: '0 0 8px rgba(37,99,235,0.15)',
                  }}
                />
              ) : (
                <Box
                  sx={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 1,
                    px: 1.5,
                    py: 0.5,
                    bgcolor: '#F0FDF4',
                    borderRadius: 4,
                    border: '1px solid #86EFAC',
                    alignSelf: { xs: 'flex-start', sm: 'center' },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4 }}>
                    <Box
                      sx={{
                        width: 5,
                        height: 5,
                        borderRadius: '50%',
                        bgcolor: '#16A34A',
                        animation: 'pulseDot 1.4s infinite ease-in-out',
                        '@keyframes pulseDot': {
                          '0%, 100%': { opacity: 0.25, transform: 'scale(0.8)' },
                          '50%': { opacity: 1, transform: 'scale(1.2)' },
                        },
                      }}
                    />
                    <Box
                      sx={{
                        width: 5,
                        height: 5,
                        borderRadius: '50%',
                        bgcolor: '#16A34A',
                        animation: 'pulseDot 1.4s infinite ease-in-out',
                        animationDelay: '0.25s',
                      }}
                    />
                    <Box
                      sx={{
                        width: 5,
                        height: 5,
                        borderRadius: '50%',
                        bgcolor: '#16A34A',
                        animation: 'pulseDot 1.4s infinite ease-in-out',
                        animationDelay: '0.5s',
                      }}
                    />
                  </Box>
                  <Typography
                    variant="caption"
                    sx={{
                      fontWeight: 700,
                      color: '#15803D',
                      fontSize: '0.71875rem',
                      letterSpacing: '0.02em',
                    }}
                  >
                    Listening...
                  </Typography>
                </Box>
              )
            ) : (
              <Chip
                size="small"
                label="Finalized Session Transcript"
                sx={{
                  height: 24,
                  fontSize: '0.71875rem',
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

      {/* Formatted Paragraph Exchanges List */}
      <CardContent
        ref={scrollRef}
        sx={{
          p: 2,
          flex: 1,
          overflowY: 'auto',
          maxHeight: { xs: 450, md: 'calc(100vh - 300px)' },
        }}
      >
        {paragraphs.length === 0 ? (
          <Box sx={{ py: 6, textAlign: 'center' }}>
            {isSessionActive ? (
              <Stack direction="column" alignItems="center" spacing={1}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, mb: 0.5 }}>
                  <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#16A34A', animation: 'pulseDot 1.4s infinite ease-in-out' }} />
                  <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#16A34A', animation: 'pulseDot 1.4s infinite ease-in-out', animationDelay: '0.25s' }} />
                  <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#16A34A', animation: 'pulseDot 1.4s infinite ease-in-out', animationDelay: '0.5s' }} />
                </Box>
                <Typography variant="body2" sx={{ fontWeight: 600, color: '#1E293B' }}>
                  Listening for spoken dialogue...
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', maxWidth: 400 }}>
                  Recognized sentences will be organized into readable paragraphs in real time.
                </Typography>
              </Stack>
            ) : (
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                No transcript recorded for this conversation.
              </Typography>
            )}
          </Box>
        ) : (
          <Stack spacing={2}>
            {paragraphs.map((para, idx) => {
              const isSalesperson =
                para.speaker.toLowerCase().includes('sales') ||
                para.speaker.toLowerCase().includes('rep') ||
                para.speaker.toLowerCase().includes('agent') ||
                para.speaker.toLowerCase().includes('employee');

              return (
                <Paper
                  key={para.id || `para-${idx}`}
                  variant="outlined"
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    bgcolor: isSalesperson ? '#F8FAFC' : '#FFFFFF',
                    borderColor: '#E2E8F0',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                    transition: 'all 150ms ease',
                  }}
                >
                  {/* Speaker Header */}
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Box
                        sx={{
                          width: 24,
                          height: 24,
                          borderRadius: 1,
                          bgcolor: isSalesperson ? '#EFF6FF' : '#FEF3C7',
                          color: isSalesperson ? '#2563EB' : '#D97706',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {isSalesperson ? <SalespersonIcon sx={{ fontSize: 16 }} /> : <CustomerIcon sx={{ fontSize: 16 }} />}
                      </Box>
                      <Typography
                        variant="caption"
                        sx={{
                          fontWeight: 700,
                          color: isSalesperson ? '#1E40AF' : '#92400E',
                          fontSize: '0.78125rem',
                        }}
                      >
                        {para.speaker}
                      </Typography>

                      {para.interimSuffix && (
                        <Chip
                          size="small"
                          icon={<TranscribingIcon sx={{ fontSize: '11px !important', color: '#2563EB !important' }} />}
                          label="transcribing..."
                          sx={{ height: 18, fontSize: '0.625rem', bgcolor: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE' }}
                        />
                      )}
                    </Stack>

                    <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.71875rem', fontFamily: 'monospace' }}>
                      {para.timestamp ? new Date(para.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Live'}
                    </Typography>
                  </Stack>

                  {/* Natural Paragraph Speech Text */}
                  <Typography
                    variant="body1"
                    component="p"
                    sx={{
                      color: '#0F172A',
                      fontWeight: 400,
                      fontSize: '0.9375rem',
                      lineHeight: 1.65,
                      pl: 0.5,
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                    }}
                  >
                    {para.text}
                    {para.interimSuffix && (
                      <Box
                        component="span"
                        sx={{
                          color: '#475569',
                          fontStyle: 'italic',
                          bgcolor: '#F1F5F9',
                          px: 0.75,
                          py: 0.2,
                          borderRadius: 1,
                          ml: para.text ? 0.75 : 0,
                          borderBottom: '2px solid #3B82F6',
                        }}
                      >
                        {para.interimSuffix}
                      </Box>
                    )}
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
