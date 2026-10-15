import React, { useState, useEffect, useRef } from 'react';
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
  Avatar,
  Paper,
  Alert,
  Divider,
  Slider,
  CircularProgress,
  Tooltip,
} from '@mui/material';
import {
  Close as CloseIcon,
  VolumeUp as VolumeUpIcon,
  Security as SecurityIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  HourglassEmpty as HourglassIcon,
  Star as StarIcon,
  Lightbulb as LightbulbIcon,
  RecordVoiceOver as SpeakerIcon,
  Person as PersonIcon,
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  Replay as ReplayIcon,
  MicOff as MicOffIcon,
} from '@mui/icons-material';
import { BACKEND_URL } from '../config/api';

function formatTime(seconds) {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export default function SessionDetailModal({ session: initialSession, onClose }) {
  if (!initialSession) return null;

  const [session, setSession] = useState(initialSession);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [audioError, setAudioError] = useState(null);
  const audioRef = useRef(null);

  // If session doesn't have audioUrl or audioFileName, attempt to fetch fresh details
  useEffect(() => {
    let isMounted = true;
    setSession(initialSession);
    setIsPlaying(false);
    setIsLoading(false);
    setCurrentTime(0);
    setDuration(0);
    setAudioError(null);

    if (initialSession.sessionId && !initialSession.audioUrl && !initialSession.audioFileName) {
      fetch(`${BACKEND_URL}/api/sessions/${initialSession.sessionId}`, { credentials: 'include' })
        .then((res) => res.json())
        .then((data) => {
          if (isMounted && data.success && data.session) {
            setSession(data.session);
          }
        })
        .catch(() => {});
    }

    return () => {
      isMounted = false;
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [initialSession]);

  const {
    sessionId,
    storeName,
    storeCode,
    salesRep,
    startedAt,
    durationSeconds = 60,
    audioUrl,
    audioFileName,
    hasAudio: sessionHasAudio,
    transcripts = [],
    analytics = {},
  } = session;

  // Resolve audio URL identical to Daily Reports
  const rawAudio = audioUrl || (audioFileName ? `/uploads/${audioFileName}` : `/api/sessions/${sessionId}/audio`);
  const hasAudio = Boolean(sessionHasAudio || audioUrl || audioFileName);
  const fullAudioUrl = rawAudio.startsWith('http')
    ? rawAudio
    : `${BACKEND_URL}${rawAudio.startsWith('/') ? '' : '/'}${rawAudio}`;

  // Audio event listeners
  const handleTogglePlay = () => {
    if (!hasAudio) return;

    if (!audioRef.current) {
      const audio = new Audio(fullAudioUrl);
      audioRef.current = audio;

      audio.onloadedmetadata = () => {
        if (audio.duration && !isNaN(audio.duration)) {
          setDuration(audio.duration);
        }
      };

      audio.ontimeupdate = () => {
        setCurrentTime(audio.currentTime);
      };

      audio.oncanplay = () => {
        setIsLoading(false);
      };

      audio.onplay = () => {
        setIsPlaying(true);
        setIsLoading(false);
        setAudioError(null);
      };

      audio.onpause = () => {
        setIsPlaying(false);
      };

      audio.onended = () => {
        setIsPlaying(false);
        setCurrentTime(0);
      };

      audio.onerror = () => {
        setIsLoading(false);
        setIsPlaying(false);
        setAudioError('Unable to play recording. The audio file may be unavailable or inaccessible.');
      };
    }

    const audio = audioRef.current;
    if (isPlaying) {
      audio.pause();
    } else {
      setIsLoading(true);
      setAudioError(null);
      audio.play().catch((err) => {
        console.warn('[SessionDetailModal] Play error:', err);
        setIsLoading(false);
        setIsPlaying(false);
        setAudioError('Playback failed. Please check your network connection or permissions.');
      });
    }
  };

  const handleSeek = (e, newValue) => {
    setCurrentTime(newValue);
    if (audioRef.current) {
      audioRef.current.currentTime = newValue;
    }
  };

  const handleReplay = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      setCurrentTime(0);
      if (!isPlaying) {
        audioRef.current.play().catch(() => {});
      }
    }
  };

  const isWon = analytics.dealOutcome === 'won';
  const isLost = analytics.dealOutcome === 'lost';

  return (
    <Dialog
      open={Boolean(initialSession)}
      onClose={() => {
        if (audioRef.current) {
          audioRef.current.pause();
        }
        onClose();
      }}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          bgcolor: '#ffffff',
          boxShadow: '0 20px 40px rgba(0,0,0,0.12)',
        },
      }}
    >
      {/* Header */}
      <DialogTitle sx={{ p: 2.5, borderBottom: '1px solid #e2e8f0', bgcolor: '#fbfcfd' }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Box>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a' }}>
                Conversation Intelligence Review
              </Typography>
              <Chip
                label={`#${sessionId?.slice(-8) || sessionId}`}
                size="small"
                sx={{
                  bgcolor: '#ecfdf5',
                  color: '#047857',
                  fontWeight: 700,
                  fontSize: '0.75rem',
                }}
              />
            </Stack>
            <Typography variant="caption" sx={{ color: '#64748b', mt: 0.5, display: 'block' }}>
              {storeName || storeCode} • Rep: <strong>{salesRep || 'Specialist'}</strong> • Duration: {durationSeconds}s • {startedAt ? new Date(startedAt).toLocaleString() : 'Recent'}
            </Typography>
          </Box>
          <IconButton onClick={onClose} size="small" sx={{ color: '#64748b' }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent sx={{ p: 3 }}>
        <Stack spacing={2.5}>
          {/* Audio Player Card (Screenshot Match) */}
          <Paper
            variant="outlined"
            sx={{
              p: 2.5,
              borderRadius: 2.5,
              bgcolor: '#ecfdf5',
              borderColor: '#a7f3d0',
            }}
          >
            {/* Top Heading Row */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 2,
                mb: 2,
              }}
            >
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Avatar sx={{ bgcolor: '#059669', color: '#ffffff', width: 42, height: 42 }}>
                  <VolumeUpIcon />
                </Avatar>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#065f46' }}>
                    In-Store Voice Audio Recording
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#047857' }}>
                    {hasAudio
                      ? 'Voice session synchronized and logged into intelligence audit.'
                      : 'Voice session synchronized and logged into intelligence audit.'}
                  </Typography>
                </Box>
              </Stack>

              {hasAudio ? (
                <Chip
                  icon={<CheckCircleIcon sx={{ color: '#059669 !important' }} />}
                  label="Audio Stream Synchronized"
                  size="small"
                  sx={{ bgcolor: '#ffffff', color: '#047857', fontWeight: 700, border: '1px solid #a7f3d0' }}
                />
              ) : (
                <Chip
                  icon={<MicOffIcon sx={{ color: '#b45309 !important' }} />}
                  label="Recording Unavailable"
                  size="small"
                  sx={{ bgcolor: '#ffffff', color: '#b45309', fontWeight: 700, border: '1px solid #fde68a' }}
                />
              )}
            </Box>

            {/* Functional Audio Player Component directly below heading */}
            {hasAudio ? (
              <Box
                sx={{
                  p: 1.5,
                  bgcolor: '#ffffff',
                  borderRadius: 2,
                  border: '1px solid #a7f3d0',
                  boxShadow: '0 2px 6px rgba(5,150,105,0.06)',
                }}
              >
                <Stack direction="row" spacing={2} alignItems="center">
                  {/* Play / Pause / Loading Button */}
                  <Tooltip title={isPlaying ? 'Pause original recording' : 'Listen to recording'}>
                    <span>
                      <IconButton
                        onClick={handleTogglePlay}
                        disabled={isLoading}
                        sx={{
                          bgcolor: '#059669',
                          color: '#ffffff',
                          width: 42,
                          height: 42,
                          flexShrink: 0,
                          '&:hover': {
                            bgcolor: '#047857',
                          },
                          '&.Mui-disabled': {
                            bgcolor: '#a7f3d0',
                            color: '#ffffff',
                          },
                        }}
                      >
                        {isLoading ? (
                          <CircularProgress size={20} sx={{ color: '#ffffff' }} />
                        ) : isPlaying ? (
                          <PauseIcon sx={{ fontSize: 22 }} />
                        ) : (
                          <PlayIcon sx={{ fontSize: 22 }} />
                        )}
                      </IconButton>
                    </span>
                  </Tooltip>

                  {/* Time indicator */}
                  <Typography
                    variant="caption"
                    sx={{
                      fontWeight: 700,
                      color: '#065f46',
                      minWidth: 78,
                      fontFamily: 'monospace',
                      fontSize: '0.8rem',
                      userSelect: 'none',
                    }}
                  >
                    {formatTime(currentTime)} / {formatTime(duration || durationSeconds || 0)}
                  </Typography>

                  {/* Scrubber / Progress Slider */}
                  <Slider
                    size="small"
                    value={currentTime}
                    min={0}
                    max={duration > 0 ? duration : durationSeconds || 60}
                    step={0.5}
                    onChange={handleSeek}
                    sx={{
                      color: '#059669',
                      height: 6,
                      '& .MuiSlider-thumb': {
                        width: 14,
                        height: 14,
                        bgcolor: '#059669',
                        '&:hover, &.Mui-focusVisible': {
                          boxShadow: '0 0 0 6px rgba(5, 150, 105, 0.16)',
                        },
                      },
                      '& .MuiSlider-track': {
                        bgcolor: '#059669',
                      },
                      '& .MuiSlider-rail': {
                        bgcolor: '#d1fae5',
                      },
                    }}
                  />

                  {/* Replay action */}
                  <Tooltip title="Restart to beginning">
                    <IconButton size="small" onClick={handleReplay} sx={{ color: '#047857' }}>
                      <ReplayIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>

                  {/* Format pill */}
                  <Chip
                    label="Original WebM"
                    size="small"
                    sx={{
                      bgcolor: '#ecfdf5',
                      color: '#047857',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      border: '1px solid #a7f3d0',
                      display: { xs: 'none', sm: 'inline-flex' },
                    }}
                  />
                </Stack>
              </Box>
            ) : (
              <Box
                sx={{
                  p: 1.5,
                  bgcolor: '#ffffff',
                  borderRadius: 2,
                  border: '1px dashed #cbd5e1',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                }}
              >
                <MicOffIcon sx={{ color: '#94a3b8', fontSize: 20 }} />
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: '#475569', fontSize: '0.85rem' }}>
                    Recording unavailable for this conversation
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#64748b' }}>
                    No counter audio recording was archived or linked to this interaction.
                  </Typography>
                </Box>
              </Box>
            )}

            {/* Playback Error Alert */}
            {audioError && (
              <Alert severity="error" sx={{ mt: 1.5, py: 0.5, borderRadius: 1.5 }}>
                {audioError}
              </Alert>
            )}
          </Paper>

          {/* AI Deal Intelligence Report Summary */}
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              borderRadius: 2.5,
              bgcolor: '#f8fafc',
              borderColor: '#e2e8f0',
            }}
          >
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
              <SecurityIcon sx={{ color: '#059669', fontSize: 20 }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0f172a' }}>
                AI RETAIL DEAL INTELLIGENCE REPORT
              </Typography>
            </Stack>
            <Typography variant="body2" sx={{ color: '#334155', lineHeight: 1.6 }}>
              {analytics.summary || 'Customer explored Apple devices with sales specialist. Conversation resolved successfully.'}
            </Typography>
          </Paper>

          {/* Highlights Grid */}
          <Grid container spacing={2}>
            {/* Outcome */}
            <Grid item xs={12} sm={4}>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: '#ffffff' }}>
                <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, display: 'block', mb: 0.5 }}>
                  OUTCOME & PROBABILITY
                </Typography>
                <Stack direction="row" spacing={1} alignItems="center">
                  {isWon ? (
                    <CheckCircleIcon sx={{ color: '#059669', fontSize: 22 }} />
                  ) : isLost ? (
                    <CancelIcon sx={{ color: '#ef4444', fontSize: 22 }} />
                  ) : (
                    <HourglassIcon sx={{ color: '#f59e0b', fontSize: 22 }} />
                  )}
                  <Typography
                    variant="subtitle1"
                    sx={{
                      fontWeight: 800,
                      color: isWon ? '#059669' : isLost ? '#ef4444' : '#d97706',
                    }}
                  >
                    {(analytics.dealOutcome || 'WON').toUpperCase()} ({analytics.closureProbability || 95}%)
                  </Typography>
                </Stack>
                <Typography variant="caption" sx={{ color: '#64748b', mt: 0.5, display: 'block' }}>
                  Customer Sentiment: <strong>{analytics.customerSentiment || 'Positive'}</strong>
                </Typography>
              </Paper>
            </Grid>

            {/* Devices Discussed */}
            <Grid item xs={12} sm={4}>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: '#ffffff' }}>
                <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, display: 'block', mb: 0.5 }}>
                  DEVICES DISCUSSED
                </Typography>
                <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
                  {(analytics.devicesDiscussed || ['iPhone 16 Pro']).map((dev, i) => (
                    <Chip
                      key={i}
                      label={dev}
                      size="small"
                      sx={{ bgcolor: '#ecfdf5', color: '#047857', fontWeight: 700, fontSize: '0.72rem' }}
                    />
                  ))}
                </Stack>
              </Paper>
            </Grid>

            {/* Sales Coaching Score */}
            <Grid item xs={12} sm={4}>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, bgcolor: '#ffffff' }}>
                <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, display: 'block', mb: 0.5 }}>
                  SALES REP SCORE
                </Typography>
                <Stack direction="row" spacing={1} alignItems="center">
                  <StarIcon sx={{ color: '#f59e0b', fontSize: 20 }} />
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#059669' }}>
                    {analytics.salesRepPerformance?.score || 90}/100
                  </Typography>
                </Stack>
                <Typography variant="caption" sx={{ color: '#64748b', mt: 0.5, display: 'block' }}>
                  {analytics.salesRepPerformance?.coachingNotes || 'Strong rapport and objection handling.'}
                </Typography>
              </Paper>
            </Grid>
          </Grid>

          {/* Coaching & Missed Opportunities */}
          {(analytics.missedOpportunities?.length > 0 || analytics.salesRepPerformance?.areasToImprove?.length > 0) && (
            <Alert
              severity="warning"
              icon={<LightbulbIcon sx={{ color: '#d97706' }} />}
              sx={{ borderRadius: 2, bgcolor: '#fef3c7', borderColor: '#fde68a' }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#b45309', mb: 0.5 }}>
                Coaching & Revenue Growth Opportunities
              </Typography>
              <Box component="ul" sx={{ pl: 2, m: 0, fontSize: '0.82rem', color: '#78350f' }}>
                {(analytics.missedOpportunities || analytics.salesRepPerformance?.areasToImprove || []).map((tip, i) => (
                  <li key={i}>{tip}</li>
                ))}
              </Box>
            </Alert>
          )}

          {/* Full Multilingual Transcript */}
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0f172a', mb: 1.5 }}>
              💬 Synchronized Speech Transcript ({transcripts.length} exchanges)
            </Typography>

            <Paper
              variant="outlined"
              sx={{
                p: 2,
                borderRadius: 2.5,
                bgcolor: '#f8fafc',
                maxHeight: 280,
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: 1.5,
              }}
            >
              {transcripts.length === 0 ? (
                <Typography variant="body2" sx={{ color: '#94a3b8', textAlign: 'center', py: 2 }}>
                  No transcript records saved for this session.
                </Typography>
              ) : (
                transcripts.map((t, idx) => (
                  <Box
                    key={idx}
                    sx={{
                      p: 1.5,
                      borderRadius: 2,
                      bgcolor: t.speaker === 'customer' ? '#ffffff' : '#ecfdf5',
                      border: t.signal ? '1px solid #10b981' : '1px solid #e2e8f0',
                    }}
                  >
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        {t.speaker === 'customer' ? (
                          <PersonIcon sx={{ color: '#f59e0b', fontSize: 16 }} />
                        ) : (
                          <SpeakerIcon sx={{ color: '#059669', fontSize: 16 }} />
                        )}
                        <Typography
                          variant="caption"
                          sx={{
                            fontWeight: 800,
                            color: t.speaker === 'customer' ? '#b45309' : '#047857',
                            textTransform: 'uppercase',
                          }}
                        >
                          {t.speaker === 'customer' ? 'Customer' : 'Sales Specialist'}
                        </Typography>
                      </Stack>
                      {t.signal && (
                        <Chip
                          label={`✓ ${t.signal}`}
                          size="small"
                          sx={{
                            height: 20,
                            bgcolor: '#d1fae5',
                            color: '#047857',
                            fontWeight: 800,
                            fontSize: '0.68rem',
                          }}
                        />
                      )}
                    </Stack>
                    <Typography variant="body2" sx={{ color: '#1e293b', lineHeight: 1.5 }}>
                      {t.englishText || t.text}
                    </Typography>
                    {t.isTranslated && t.originalText && (
                      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5, fontStyle: 'italic' }}>
                        Original: "{t.originalText}"
                      </Typography>
                    )}
                  </Box>
                ))
              )}
            </Paper>
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #e2e8f0' }}>
        <Button onClick={onClose} variant="contained" sx={{ fontWeight: 700 }}>
          Close Review
        </Button>
      </DialogActions>
    </Dialog>
  );
}
