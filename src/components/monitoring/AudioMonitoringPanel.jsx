import { useState, useEffect, useRef } from 'react';
import {
  Card,
  CardHeader,
  CardContent,
  Typography,
  Stack,
  Box,
  Chip,
  Paper,
  Button,
  Divider,
} from '@mui/material';
import {
  VolumeUp as VolumeIcon,
  VolumeOff as VolumeOffIcon,
  GraphicEq as WaveIcon,
  Mic as MicIcon,
} from '@mui/icons-material';

const DEFAULT_BARS = [15, 25, 45, 30, 60, 50, 20, 55, 70, 40, 30, 60, 40, 25, 45, 20];

export default function AudioMonitoringPanel({ conversation, socket, token }) {
  const [isListening, setIsListening] = useState(false);
  const [streamActive, setStreamActive] = useState(false);
  const [audioLevels, setAudioLevels] = useState(DEFAULT_BARS);

  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const nextPlayTimeRef = useRef(0);
  const animationFrameRef = useRef(null);
  const activeSessionIdRef = useRef(null);

  const sessionId = conversation?.id;
  const isSessionActive = conversation?.isLive || conversation?.status === 'active';

  // Cleanup on conversation change or unmount
  useEffect(() => {
    activeSessionIdRef.current = sessionId;

    return () => {
      stopListening();
    };
  }, [sessionId]);

  const stopListening = () => {
    if (socket && activeSessionIdRef.current) {
      socket.emit('audio_monitoring_unsubscribe', { sessionId: activeSessionIdRef.current });
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      try {
        audioCtxRef.current.close();
      } catch (e) {
        // Ignore close error
      }
      audioCtxRef.current = null;
    }

    analyserRef.current = null;
    nextPlayTimeRef.current = 0;
    setIsListening(false);
    setStreamActive(false);
    setAudioLevels(DEFAULT_BARS);
  };

  const startListening = async () => {
    if (!conversation || !socket) return;

    try {
      // 1. Initialize Web Audio API within user gesture
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioContextClass();
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.8;
      analyser.connect(ctx.destination);

      audioCtxRef.current = ctx;
      analyserRef.current = analyser;
      nextPlayTimeRef.current = ctx.currentTime;

      // 2. Subscribe to audio room on backend
      const authToken = token || localStorage.getItem('storelistener_token');
      socket.emit('audio_monitoring_subscribe', {
        sessionId: conversation.id,
        token: authToken,
      });

      setIsListening(true);
      setStreamActive(true);

      // 3. Setup dynamic visualizer loop
      const updateVisualizer = () => {
        if (!analyserRef.current) return;
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);

        // Map to 16 bars
        const bars = [];
        const step = Math.max(1, Math.floor(dataArray.length / 16));
        for (let i = 0; i < 16; i++) {
          const val = dataArray[i * step] || 0;
          // Scale 0-255 to percentage 15% - 100%
          const pct = Math.max(15, Math.min(100, Math.round((val / 255) * 100)));
          bars.push(pct);
        }
        setAudioLevels(bars);
        animationFrameRef.current = requestAnimationFrame(updateVisualizer);
      };
      animationFrameRef.current = requestAnimationFrame(updateVisualizer);
    } catch (err) {
      console.error('Audio monitoring initialization error:', err);
      stopListening();
    }
  };

  // Socket listener for live audio chunks
  useEffect(() => {
    if (!socket || !isListening) return;

    const handleLiveAudio = async (data) => {
      if (!audioCtxRef.current || !data || data.sessionId !== sessionId) return;

      try {
        let arrayBuffer;
        if (typeof data.chunk === 'string') {
          // Base64 to ArrayBuffer
          const binaryString = window.atob(data.chunk);
          const len = binaryString.length;
          const bytes = new Uint8Array(len);
          for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          arrayBuffer = bytes.buffer;
        } else if (data.chunk instanceof ArrayBuffer) {
          arrayBuffer = data.chunk;
        } else if (data.chunk && data.chunk.buffer) {
          arrayBuffer = data.chunk.buffer;
        }

        if (!arrayBuffer) return;

        // Decode audio chunk
        const ctx = audioCtxRef.current;
        if (ctx.state === 'suspended') {
          await ctx.resume();
        }

        ctx.decodeAudioData(
          arrayBuffer.slice(0),
          (audioBuffer) => {
            if (!audioCtxRef.current || !analyserRef.current) return;

            const source = ctx.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(analyserRef.current);

            // Schedule low-latency contiguous playback
            const currentTime = ctx.currentTime;
            const startTime = Math.max(currentTime, nextPlayTimeRef.current);
            source.start(startTime);
            nextPlayTimeRef.current = startTime + audioBuffer.duration;
            setStreamActive(true);
          },
          (decodeErr) => {
            // Some WebM fragments may need container header; silently ignore non-standalone chunks
          }
        );
      } catch (e) {
        // Non-blocking playback catch
      }
    };

    socket.on('admin_live_audio', handleLiveAudio);

    return () => {
      socket.off('admin_live_audio', handleLiveAudio);
    };
  }, [socket, isListening, sessionId]);

  if (!conversation) return null;

  return (
    <Card sx={{ mb: 2.5 }}>
      <CardHeader
        title={
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              Audio Feed Monitor
            </Typography>
            {isListening ? (
              <Chip
                size="small"
                icon={<WaveIcon sx={{ fontSize: '11px !important', color: '#16A34A !important' }} />}
                label="LIVE AUDIO ACTIVE"
                sx={{
                  height: 20,
                  fontSize: '0.625rem',
                  fontWeight: 700,
                  bgcolor: '#F0FDF4',
                  color: '#15803D',
                  borderColor: '#86EFAC',
                  borderWidth: 1,
                  borderStyle: 'solid',
                }}
              />
            ) : (
              <Chip
                size="small"
                label={isSessionActive ? 'Live Audio Ready' : 'Standby'}
                sx={{
                  height: 20,
                  fontSize: '0.625rem',
                  fontWeight: 600,
                  bgcolor: '#F1F5F9',
                  color: '#64748B',
                }}
              />
            )}
          </Stack>
        }
        subheader={
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.25 }}>
            Low-latency microphone feed from Electron desktop terminal
          </Typography>
        }
        sx={{ p: 2, pb: 1.5 }}
      />
      <Divider />

      <CardContent sx={{ p: 2 }}>
        {/* Waveform Visualization Container */}
        <Paper
          variant="outlined"
          sx={{
            p: 2,
            bgcolor: isListening ? '#F0FDF4' : '#F8FAFC',
            borderColor: isListening ? '#86EFAC' : 'divider',
            borderRadius: 1.5,
            mb: 2,
            transition: 'background-color 200ms ease, border-color 200ms ease',
          }}
        >
          {/* Status Label Row */}
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
            <Stack direction="row" spacing={0.75} alignItems="center">
              <MicIcon sx={{ fontSize: 16, color: isListening ? '#16A34A' : 'text.secondary' }} />
              <Typography variant="caption" sx={{ fontWeight: 600, color: isListening ? '#15803D' : 'text.secondary' }}>
                Counter Terminal Stream
              </Typography>
            </Stack>

            <Typography variant="caption" sx={{ color: 'text.disabled', fontFamily: 'monospace' }}>
              48 kHz • Low Latency
            </Typography>
          </Stack>

          {/* Real-time Dynamic Waveform Graphic */}
          <Box
            sx={{
              height: 48,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              px: 1,
            }}
          >
            {audioLevels.map((heightPercent, index) => (
              <Box
                key={index}
                sx={{
                  width: 4,
                  height: `${heightPercent}%`,
                  bgcolor: isListening
                    ? index % 3 === 0
                      ? '#16A34A'
                      : '#4ADE80'
                    : '#CBD5E1',
                  borderRadius: 1,
                  transition: 'height 80ms ease, background-color 150ms ease',
                }}
              />
            ))}
          </Box>
        </Paper>

        {/* Playback Controls & Action Button */}
        <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1.5}>
          {isListening ? (
            <Button
              size="small"
              variant="outlined"
              color="error"
              startIcon={<VolumeOffIcon />}
              onClick={stopListening}
              sx={{ fontWeight: 600, fontSize: '0.8125rem' }}
            >
              Stop Listening
            </Button>
          ) : (
            <Button
              size="small"
              variant="contained"
              color="primary"
              startIcon={<VolumeIcon />}
              onClick={startListening}
              sx={{ fontWeight: 600, fontSize: '0.8125rem' }}
            >
              Listen Live
            </Button>
          )}

          <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>
            {isListening
              ? streamActive
                ? '🟢 Streaming Live'
                : '🟡 Buffering Stream...'
              : 'Click to start real-time audio monitor'}
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}
