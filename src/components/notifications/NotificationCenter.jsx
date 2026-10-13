/**
 * Storelistener — Interactive Notification Center (Module 8)
 * File: src/components/notifications/NotificationCenter.jsx
 *
 * Implements:
 * 1. Live unread badge on topbar bell icon
 * 2. Real-time updates via Socket.IO without page refresh
 * 3. Popover drawer with filter tabs (All, Unread)
 * 4. Rich severity badges, timestamps, store/rep metadata
 * 5. Mark as read, mark all read, and quick navigation
 */

import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import {
  Box,
  Typography,
  Stack,
  IconButton,
  Badge,
  Popover,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemButton,
  Button,
  Chip,
  Tooltip,
  CircularProgress,
  Tabs,
  Tab,
  Alert,
} from '@mui/material';
import {
  NotificationsOutlined as BellIcon,
  NotificationsActive as ActiveBellIcon,
  CheckCircle as SuccessIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  DoneAll as MarkAllReadIcon,
  Done as MarkReadIcon,
  Settings as SettingsIcon,
  Refresh as RefreshIcon,
  ArrowForward as ArrowIcon,
  DeleteOutline as DeleteIcon,
} from '@mui/icons-material';

import { BACKEND_URL } from '../../config/api';

const SEVERITY_CONFIG = {
  success: { color: '#15803D', bgColor: '#F0FDF4', icon: SuccessIcon },
  warning: { color: '#B45309', bgColor: '#FFFBEB', icon: WarningIcon },
  error: { color: '#B91C1C', bgColor: '#FEF2F2', icon: ErrorIcon },
  info: { color: '#1D4ED8', bgColor: '#EFF6FF', icon: InfoIcon },
};

export default function NotificationCenter({ token, socket, onNavigate }) {
  const [anchorEl, setAnchorEl] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [filterTab, setFilterTab] = useState('all'); // 'all' | 'unread'

  const open = Boolean(anchorEl);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const authToken = token || localStorage.getItem('storelistener_token');
      const res = await fetch(`${BACKEND_URL}/api/notifications?limit=30`, {
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
      });
      const data = await res.json();
      if (data.success) {
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (err) {
      console.warn('Failed to load notifications:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();

    const activeSocket = socket || io(BACKEND_URL, { reconnection: true, timeout: 5000 });

    const handleNewNotification = (data) => {
      if (data && data.notification) {
        setNotifications((prev) => [data.notification, ...prev.filter((n) => n._id !== data.notification._id)]);
        setUnreadCount((prev) => prev + 1);
      }
    };

    const handleCountUpdate = (data) => {
      if (data && typeof data.unreadCount === 'number') {
        setUnreadCount(data.unreadCount);
      }
    };

    activeSocket.on('new_notification', handleNewNotification);
    activeSocket.on('notifications_count_update', handleCountUpdate);

    return () => {
      activeSocket.off('new_notification', handleNewNotification);
      activeSocket.off('notifications_count_update', handleCountUpdate);
      if (!socket && activeSocket) {
        activeSocket.disconnect();
      }
    };
  }, [socket, token]);

  const handleOpen = (event) => {
    setAnchorEl(event.currentTarget);
    fetchNotifications();
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleMarkAsRead = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      const authToken = token || localStorage.getItem('storelistener_token');
      const res = await fetch(`${BACKEND_URL}/api/notifications/${id}/read`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
      });
      const data = await res.json();
      if (data.success) {
        setNotifications((prev) =>
          prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.warn('Mark as read failed:', err.message);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const authToken = token || localStorage.getItem('storelistener_token');
      const res = await fetch(`${BACKEND_URL}/api/notifications/mark-all-read`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
      });
      const data = await res.json();
      if (data.success) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        setUnreadCount(0);
      }
    } catch (err) {
      console.warn('Mark all read failed:', err.message);
    }
  };

  const handleNotificationClick = (item) => {
    if (!item.isRead) {
      handleMarkAsRead(item._id);
    }
    handleClose();

    if (onNavigate) {
      if (item.sessionId) {
        onNavigate('conversations');
      } else if (item.type.includes('store_')) {
        onNavigate('live-monitoring');
      }
    }
  };

  const filteredList = notifications.filter((n) => {
    if (filterTab === 'unread') return !n.isRead;
    return true;
  });

  return (
    <>
      <Tooltip title={unreadCount > 0 ? `${unreadCount} unread alert(s)` : 'No unread alerts'}>
        <IconButton
          size="small"
          onClick={handleOpen}
          sx={{
            color: unreadCount > 0 ? 'primary.main' : 'text.secondary',
            border: '1px solid',
            borderColor: unreadCount > 0 ? 'primary.light' : 'divider',
            borderRadius: 1.5,
            p: 0.75,
            bgcolor: unreadCount > 0 ? '#EFF6FF' : 'transparent',
          }}
          aria-label="notifications"
        >
          <Badge badgeContent={unreadCount} color="error" max={99}>
            {unreadCount > 0 ? <ActiveBellIcon sx={{ fontSize: 18 }} /> : <BellIcon sx={{ fontSize: 18 }} />}
          </Badge>
        </IconButton>
      </Tooltip>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{
          sx: {
            width: { xs: 340, sm: 420 },
            maxHeight: 560,
            borderRadius: 2.5,
            boxShadow: '0 12px 32px rgba(0, 0, 0, 0.12)',
            border: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            flexDirection: 'column',
          },
        }}
      >
        {/* Header */}
        <Box sx={{ p: 2, pb: 1.5 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                Notification Center
              </Typography>
              {unreadCount > 0 && (
                <Chip
                  size="small"
                  label={`${unreadCount} New`}
                  sx={{
                    height: 20,
                    fontSize: '0.6875rem',
                    fontWeight: 700,
                    bgcolor: '#FEF2F2',
                    color: '#B91C1C',
                  }}
                />
              )}
            </Stack>

            <Stack direction="row" spacing={0.5}>
              {unreadCount > 0 && (
                <Tooltip title="Mark all as read">
                  <IconButton size="small" onClick={handleMarkAllRead}>
                    <MarkAllReadIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
              <Tooltip title="Refresh">
                <IconButton size="small" onClick={fetchNotifications} disabled={loading}>
                  <RefreshIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>
          </Stack>

          {/* Filter Tabs */}
          <Tabs
            value={filterTab}
            onChange={(e, val) => setFilterTab(val)}
            sx={{ minHeight: 32, mt: 1 }}
          >
            <Tab label="All Alerts" value="all" sx={{ minHeight: 32, py: 0.5, fontSize: '0.75rem', fontWeight: 600 }} />
            <Tab label={`Unread (${unreadCount})`} value="unread" sx={{ minHeight: 32, py: 0.5, fontSize: '0.75rem', fontWeight: 600 }} />
          </Tabs>
        </Box>
        <Divider />

        {/* Notification List */}
        <Box sx={{ flex: 1, overflowY: 'auto' }}>
          {loading && notifications.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <CircularProgress size={24} />
            </Box>
          ) : filteredList.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                {filterTab === 'unread' ? 'No unread notifications' : 'No alerts recorded'}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                Operational events from retail branches will appear here in real time.
              </Typography>
            </Box>
          ) : (
            <List disablePadding>
              {filteredList.map((item) => {
                const conf = SEVERITY_CONFIG[item.severity] || SEVERITY_CONFIG.info;
                const IconComponent = conf.icon;

                return (
                  <ListItem
                    key={item._id}
                    disablePadding
                    sx={{
                      bgcolor: item.isRead ? 'transparent' : '#F8FAFC',
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                      '&:hover': { bgcolor: '#F1F5F9' },
                    }}
                  >
                    <ListItemButton
                      onClick={() => handleNotificationClick(item)}
                      sx={{ py: 1.25, px: 2, alignItems: 'flex-start' }}
                    >
                      <ListItemIcon sx={{ minWidth: 32, mt: 0.5 }}>
                        <IconComponent sx={{ fontSize: 18, color: conf.color }} />
                      </ListItemIcon>

                      <ListItemText
                        primary={
                          <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Typography variant="subtitle2" sx={{ fontWeight: item.isRead ? 600 : 700, fontSize: '0.8125rem' }}>
                              {item.title}
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.6875rem' }}>
                              {item.createdAt ? new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                            </Typography>
                          </Stack>
                        }
                        secondary={
                          <Box sx={{ mt: 0.5 }}>
                            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', lineHeight: 1.3 }}>
                              {item.description}
                            </Typography>

                            <Stack direction="row" spacing={1} sx={{ mt: 0.75 }} alignItems="center">
                              {item.storeCode && (
                                <Chip
                                  size="small"
                                  label={item.storeCode}
                                  sx={{ height: 16, fontSize: '0.625rem', fontWeight: 600, bgcolor: '#E2E8F0' }}
                                />
                              )}
                              {item.salesRep && (
                                <Typography variant="caption" sx={{ fontSize: '0.6875rem', color: 'text.secondary' }}>
                                  {item.salesRep}
                                </Typography>
                              )}
                            </Stack>
                          </Box>
                        }
                      />

                      {!item.isRead && (
                        <Tooltip title="Mark as read">
                          <IconButton
                            size="small"
                            onClick={(e) => handleMarkAsRead(item._id, e)}
                            sx={{ mt: 0.5, p: 0.5 }}
                          >
                            <MarkReadIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>
                      )}
                    </ListItemButton>
                  </ListItem>
                );
              })}
            </List>
          )}
        </Box>

        {/* Footer */}
        <Divider />
        <Box sx={{ p: 1.25, px: 2, bgcolor: '#F8FAFC', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Button
            size="small"
            startIcon={<SettingsIcon />}
            onClick={() => {
              handleClose();
              if (onNavigate) onNavigate('settings');
            }}
            sx={{ fontSize: '0.75rem', textTransform: 'none', fontWeight: 600 }}
          >
            Alert Settings
          </Button>

          <Button
            size="small"
            endIcon={<ArrowIcon fontSize="small" />}
            onClick={() => {
              handleClose();
              if (onNavigate) onNavigate('reports');
            }}
            sx={{ fontSize: '0.75rem', textTransform: 'none', fontWeight: 600 }}
          >
            View Deal Reports
          </Button>
        </Box>
      </Popover>
    </>
  );
}
