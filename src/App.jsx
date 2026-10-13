import React, { useState, useEffect } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Box, CircularProgress, Typography, Avatar } from '@mui/material';

import { storelistenerTheme } from './theme/theme.config';
import AuthView from './components/AuthView';
import StoreAdminDashboard from './components/StoreAdminDashboard';
import SalesManagerDashboard from './components/SalesManagerDashboard';
import OwnerDashboard from './components/dashboard/OwnerDashboard';

import { BACKEND_URL } from './config/api';

export default function App() {
  const [showOwnerPreview, setShowOwnerPreview] = useState(() => {
    return window.location.hash === '#dashboard' || window.location.hash === '#owner-dashboard';
  });
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('storelistener_user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Requirement D: Never store JWT in localStorage/sessionStorage. Clean up legacy keys.
  useEffect(() => {
    try {
      localStorage.removeItem('storelistener_token');
      sessionStorage.removeItem('storelistener_token');
    } catch (e) {
      // Ignore
    }
  }, []);

  // Validate session against backend /api/auth/me on mount using HttpOnly cookie
  useEffect(() => {
    fetch(`${BACKEND_URL}/api/auth/me`, {
      credentials: 'include',
    })
      .then((res) => {
        if (!res.ok) throw new Error('Not authenticated');
        return res.json();
      })
      .then((data) => {
        if (data.success && data.user) {
          setCurrentUser(data.user);
          localStorage.setItem('storelistener_user', JSON.stringify(data.user));
        } else {
          handleLogout();
        }
      })
      .catch(() => {
        // Not authenticated or session expired
        setCurrentUser(null);
        localStorage.removeItem('storelistener_user');
      })
      .finally(() => {
        setCheckingAuth(false);
      });
  }, []);

  const handleAuthSuccess = (firstArg, secondArg) => {
    // Gracefully handle either onAuthSuccess(user) or legacy onAuthSuccess(token, user)
    const user = (firstArg && typeof firstArg === 'object' && (firstArg.email || firstArg.role)) ? firstArg : secondArg;
    setCurrentUser(user);
    if (user) {
      localStorage.setItem('storelistener_user', JSON.stringify(user));
    }
    // Guarantee no token in localStorage
    localStorage.removeItem('storelistener_token');
    sessionStorage.removeItem('storelistener_token');
  };

  const handleLogout = async () => {
    try {
      await fetch(`${BACKEND_URL}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch (err) {
      console.warn('Logout network error:', err.message);
    }
    setCurrentUser(null);
    localStorage.removeItem('storelistener_token');
    sessionStorage.removeItem('storelistener_token');
    localStorage.removeItem('storelistener_user');
  };

  return (
    <ThemeProvider theme={storelistenerTheme}>
      <CssBaseline />
      {checkingAuth ? (
        <Box
          sx={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: '#f8fafc',
            flexDirection: 'column',
          }}
        >
          <Avatar
            sx={{
              width: 56,
              height: 56,
              bgcolor: '#059669',
              background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
              boxShadow: '0 8px 24px rgba(5, 150, 105, 0.25)',
              mb: 2,
              fontSize: '1.75rem',
            }}
          >
            🎙️
          </Avatar>
          <CircularProgress size={32} sx={{ color: '#059669', mb: 2 }} />
          <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 600 }}>
            Verifying secure session...
          </Typography>
        </Box>
      ) : showOwnerPreview ? (
        <OwnerDashboard
          currentUser={currentUser || { name: 'Owner / Store Admin', role: 'store_admin', email: 'admin@store.com' }}
          token={null}
          onLogout={() => setShowOwnerPreview(false)}
        />
      ) : !currentUser ? (
        <AuthView
          onAuthSuccess={handleAuthSuccess}
          onPreviewOwnerDashboard={() => setShowOwnerPreview(true)}
        />
      ) : currentUser.role === 'store_admin' ? (
        <OwnerDashboard
          currentUser={currentUser}
          token={null}
          onLogout={handleLogout}
        />
      ) : (
        <SalesManagerDashboard
          currentUser={currentUser}
          onLogout={handleLogout}
        />
      )}
    </ThemeProvider>
  );
}
