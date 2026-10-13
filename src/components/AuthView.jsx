/**
 * Storelistener — Owner Authentication Portal
 * File: src/components/AuthView.jsx
 *
 * Implements:
 * 1. Store Owner Web Login using HttpOnly cookies (no tokens in localStorage)
 * 2. Removal of all Sales Manager signup forms and public registration links from web dashboard
 * 3. Clear guidance that Sales Managers register & sign in through the Desktop Application
 * 4. Full compliance with centralized MUI theme tokens
 */

import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Stack,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
  Chip,
  Avatar,
  Divider,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Mail as MailIcon,
  Lock as LockIcon,
  Visibility,
  VisibilityOff,
  AdminPanelSettings as AdminIcon,
  DesktopWindows as DesktopIcon,
  ArrowForward as ArrowForwardIcon,
  InfoOutlined as InfoIcon,
} from '@mui/icons-material';

const BACKEND_URL = 'http://localhost:5000';

export default function AuthView({ onAuthSuccess, onPreviewOwnerDashboard }) {
  // Login fields
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // Status & Messaging
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [statusDialog, setStatusDialog] = useState({
    open: false,
    title: '',
    severity: 'info',
    message: '',
    user: null,
  });

  // Submit Login
  const handleLogin = async (e) => {
    e?.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // Receive and store HttpOnly cookie
        body: JSON.stringify({
          email: loginEmail.trim().toLowerCase(),
          password: loginPassword,
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        if (data.status === 'pending') {
          setStatusDialog({
            open: true,
            title: 'Account Pending Approval',
            severity: 'warning',
            message: 'Your account is currently pending verification by the Store Owner. You will be able to log in once your store assignment is approved.',
            user: { email: loginEmail.trim() },
          });
          setErrorMsg('Account pending verification by Store Owner.');
        } else if (data.status === 'rejected') {
          setStatusDialog({
            open: true,
            title: 'Account Registration Rejected',
            severity: 'error',
            message: data.error || 'Your registration request was not approved by the Store Owner.',
            user: { email: loginEmail.trim() },
          });
          setErrorMsg(data.error || 'Account registration was rejected.');
        } else if (data.status === 'disabled') {
          setStatusDialog({
            open: true,
            title: 'Account Access Revoked',
            severity: 'error',
            message: 'Your account has been deactivated by the Store Owner. Active sessions have been terminated.',
            user: { email: loginEmail.trim() },
          });
          setErrorMsg('Account disabled by Store Owner.');
        } else {
          setErrorMsg(data.error || 'Invalid email or password.');
        }
        return;
      }

      // Success: pass user profile without storing JWT in localStorage
      onAuthSuccess(data.user);
    } catch (err) {
      setErrorMsg('Cannot connect to authentication server: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Quick Demo Owner Login
  const handleQuickDemoLogin = () => {
    setErrorMsg('');
    setLoginEmail('admin@store.com');
    setLoginPassword('admin123');
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: '#f1f5f9',
        background: 'radial-gradient(circle at 10% 20%, #f8fafc 0%, #e2e8f0 90%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: { xs: 2, sm: 3 },
      }}
    >
      <Card
        elevation={0}
        sx={{
          maxWidth: 480,
          width: '100%',
          borderRadius: 3.5,
          border: '1px solid',
          borderColor: '#cbd5e1',
          boxShadow: '0 20px 45px -10px rgba(15, 23, 42, 0.12)',
          bgcolor: '#ffffff',
          overflow: 'hidden',
        }}
      >
        {/* Header Banner */}
        <Box
          sx={{
            p: { xs: 3, sm: 4 },
            pb: 3,
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
            color: '#ffffff',
            textAlign: 'center',
          }}
        >
          <Avatar
            sx={{
              width: 56,
              height: 56,
              bgcolor: 'primary.main',
              boxShadow: '0 8px 20px rgba(5, 150, 105, 0.35)',
              mx: 'auto',
              mb: 1.5,
              fontSize: '1.75rem',
            }}
          >
            🎙️
          </Avatar>
          <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}>
            Storelistener Owner Portal
          </Typography>
          <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.8125rem' }}>
            Multi-Store Sales Intelligence & Approval Dashboard
          </Typography>
        </Box>

        {/* Portal Scope Badge */}
        <Box sx={{ px: 3, py: 1.75, bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
          <Stack direction="row" alignItems="center" spacing={1} justifyContent="center">
            <AdminIcon sx={{ fontSize: 18, color: '#059669' }} />
            <Typography variant="caption" sx={{ fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Authorized Owner / Store Admin Access Only
            </Typography>
          </Stack>
        </Box>

        <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
          {errorMsg && (
            <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }} onClose={() => setErrorMsg('')}>
              {errorMsg}
            </Alert>
          )}

          {/* Login Form */}
          <form onSubmit={handleLogin}>
            <Stack spacing={2.5}>
              <TextField
                fullWidth
                label="Store Owner Email"
                placeholder="admin@store.com"
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                required
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <MailIcon sx={{ color: '#64748b' }} />
                    </InputAdornment>
                  ),
                }}
              />

              <TextField
                fullWidth
                label="Password"
                type={showLoginPassword ? 'text' : 'password'}
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                required
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockIcon sx={{ color: '#64748b' }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowLoginPassword(!showLoginPassword)} edge="end" size="small">
                        {showLoginPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />

              <Button
                type="submit"
                variant="contained"
                size="large"
                fullWidth
                disabled={loading}
                endIcon={loading ? <CircularProgress size={20} color="inherit" /> : <ArrowForwardIcon />}
                sx={{
                  py: 1.4,
                  fontWeight: 700,
                  fontSize: '0.9375rem',
                  boxShadow: '0 4px 14px rgba(5, 150, 105, 0.25)',
                }}
              >
                {loading ? 'Authenticating...' : 'Sign In as Owner'}
              </Button>
            </Stack>
          </form>

          {/* Quick Demo Fill Helper */}
          <Paper
            variant="outlined"
            sx={{
              mt: 3,
              p: 2,
              borderRadius: 2,
              bgcolor: '#f8fafc',
              borderColor: '#e2e8f0',
            }}
          >
            <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 700, color: '#475569', display: 'block' }}>
                  Configured Owner Account
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748b' }}>
                  admin@store.com
                </Typography>
              </Box>
              <Chip
                label="Fill Credentials"
                size="small"
                onClick={handleQuickDemoLogin}
                clickable
                color="primary"
                variant="outlined"
                sx={{ fontWeight: 600, fontSize: '0.72rem' }}
              />
            </Stack>
          </Paper>

          {/* Workstation / Sales Manager Signup Notice */}
          <Box
            sx={{
              mt: 3,
              p: 2,
              borderRadius: 2,
              bgcolor: '#f0fdf4',
              border: '1px solid #bbf7d0',
            }}
          >
            <Stack direction="row" spacing={1.5} alignItems="flex-start">
              <DesktopIcon sx={{ color: '#059669', fontSize: 20, mt: 0.2 }} />
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 700, color: '#166534', display: 'block' }}>
                  Sales Manager Workstation Terminal Notice
                </Typography>
                <Typography variant="caption" sx={{ color: '#15803d', display: 'block', mt: 0.5, lineHeight: 1.4 }}>
                  Sales Manager signups and terminal logins are conducted exclusively through the <strong>Storelistener Electron Desktop Application</strong> at store POS counters.
                </Typography>
              </Box>
            </Stack>
          </Box>

          {/* Preview Owner Dashboard button for evaluation */}
          {onPreviewOwnerDashboard && (
            <Box sx={{ mt: 2.5, textAlign: 'center' }}>
              <Button
                variant="text"
                size="small"
                onClick={onPreviewOwnerDashboard}
                sx={{
                  color: '#64748b',
                  fontSize: '0.78rem',
                  textTransform: 'none',
                  '&:hover': { color: 'primary.main', bgcolor: 'transparent' },
                }}
              >
                Direct Dashboard View (Development Mode)
              </Button>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Account Status Modal Dialog */}
      <Dialog
        open={statusDialog.open}
        onClose={() => setStatusDialog((prev) => ({ ...prev, open: false }))}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1.1rem' }}>
          {statusDialog.title}
        </DialogTitle>
        <DialogContent>
          <Alert severity={statusDialog.severity} sx={{ mb: 2, borderRadius: 2 }}>
            {statusDialog.message}
          </Alert>
          <Typography variant="body2" sx={{ color: '#64748b' }}>
            Only active accounts approved by the Store Owner are authorized to access the system.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setStatusDialog((prev) => ({ ...prev, open: false }))}
            variant="contained"
            color="primary"
            fullWidth
            sx={{ fontWeight: 600 }}
          >
            Understood
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
