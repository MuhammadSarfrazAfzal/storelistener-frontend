/**
 * Storelistener — Pending Manager Requests & Access Control (Module 10)
 * File: src/components/dashboard/PendingManagersSection.jsx
 */

import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import {
  Card,
  CardHeader,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Chip,
  Button,
  Box,
  Stack,
  Divider,
  Tabs,
  Tab,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  TextField,
  Alert,
  IconButton,
  Tooltip,
  Snackbar,
} from '@mui/material';
import {
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Block as DisableIcon,
  HourglassEmpty as PendingIcon,
  Storefront as StoreIcon,
  Person as PersonIcon,
  Refresh as RefreshIcon,
  CheckCircleOutline as ActiveIcon,
} from '@mui/icons-material';

import { BACKEND_URL, DEFAULT_SOCKET_OPTIONS } from '../../config/api';

const STORE_LABELS = {
  'STORE-01': 'iPhone Store 01 (Downtown)',
  'STORE-02': 'iPhone Store 02 (Uptown)',
  'STORE-03': 'iPhone Store 03 (Suburbs)',
};

export default function PendingManagersSection({ currentUser, token }) {
  const [activeTab, setActiveTab] = useState(0); // 0 = Pending, 1 = All Managers
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedManager, setSelectedManager] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [feedback, setFeedback] = useState(null);

  const fetchManagers = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${BACKEND_URL}/api/auth/managers`, {
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.managers)) {
        setManagers(data.managers);
      }
    } catch (err) {
      console.warn('Failed to fetch managers list:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchManagers();

    // Listen for real-time signup and status change events
    const socket = io(BACKEND_URL, {
      ...DEFAULT_SOCKET_OPTIONS,
      auth: token ? { token } : undefined,
    });

    socket.on('sales_manager_registered', () => {
      fetchManagers();
    });

    socket.on('sales_manager_status_changed', () => {
      fetchManagers();
    });

    return () => {
      socket.disconnect();
    };
  }, [token]);

  const handleApprove = async (manager) => {
    try {
      setActionLoading(true);
      const res = await fetch(`${BACKEND_URL}/api/auth/users/${manager._id || manager.id}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({ severity: 'success', message: `Approved ${manager.name} for ${manager.storeCode}.` });
        fetchManagers();
      } else {
        setFeedback({ severity: 'error', message: data.error || 'Failed to approve manager.' });
      }
    } catch (err) {
      setFeedback({ severity: 'error', message: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenRejectDialog = (manager) => {
    setSelectedManager(manager);
    setRejectReason('');
    setRejectDialogOpen(true);
  };

  const handleConfirmReject = async () => {
    if (!selectedManager) return;
    try {
      setActionLoading(true);
      const res = await fetch(`${BACKEND_URL}/api/auth/users/${selectedManager._id || selectedManager.id}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({ reason: rejectReason || 'Application rejected by Store Owner.' }),
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({ severity: 'info', message: `Rejected application for ${selectedManager.name}.` });
        setRejectDialogOpen(false);
        fetchManagers();
      } else {
        setFeedback({ severity: 'error', message: data.error || 'Failed to reject manager.' });
      }
    } catch (err) {
      setFeedback({ severity: 'error', message: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDisable = async (manager) => {
    try {
      setActionLoading(true);
      const res = await fetch(`${BACKEND_URL}/api/auth/users/${manager._id || manager.id}/disable`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({ severity: 'warning', message: `Disabled access for ${manager.name}. Active sessions revoked.` });
        fetchManagers();
      } else {
        setFeedback({ severity: 'error', message: data.error || 'Failed to disable manager.' });
      }
    } catch (err) {
      setFeedback({ severity: 'error', message: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const pendingManagers = managers.filter((m) => m.status === 'pending');
  const otherManagers = managers.filter((m) => m.status !== 'pending');

  const getStatusChip = (status) => {
    switch (status) {
      case 'approved':
        return (
          <Chip
            size="small"
            icon={<ActiveIcon style={{ fontSize: 16 }} />}
            label="Active & Approved"
            sx={{ bgcolor: '#dcfce7', color: '#166534', fontWeight: 600 }}
          />
        );
      case 'pending':
        return (
          <Chip
            size="small"
            icon={<PendingIcon style={{ fontSize: 16 }} />}
            label="Pending Approval"
            sx={{ bgcolor: '#fef3c7', color: '#92400e', fontWeight: 600 }}
          />
        );
      case 'rejected':
        return (
          <Chip
            size="small"
            icon={<RejectIcon style={{ fontSize: 16 }} />}
            label="Rejected"
            sx={{ bgcolor: '#fee2e2', color: '#991b1b', fontWeight: 600 }}
          />
        );
      case 'disabled':
        return (
          <Chip
            size="small"
            icon={<DisableIcon style={{ fontSize: 16 }} />}
            label="Disabled"
            sx={{ bgcolor: '#f1f5f9', color: '#475569', fontWeight: 600 }}
          />
        );
      default:
        return <Chip size="small" label={status} />;
    }
  };

  return (
    <Card sx={{ width: '100%', mb: 4, borderRadius: 2, boxShadow: '0 4px 20px rgba(0,0,0,0.06)' }}>
      <CardHeader
        title={
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <PersonIcon sx={{ color: '#059669' }} />
            <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.125rem' }}>
              Sales Manager Access & Approval Workflow
            </Typography>
            {pendingManagers.length > 0 && (
              <Chip
                label={`${pendingManagers.length} Pending`}
                size="small"
                sx={{
                  bgcolor: '#f59e0b',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.75rem',
                }}
              />
            )}
          </Stack>
        }
        subheader="Manage sales manager signups, store permissions, and account activation"
        action={
          <Tooltip title="Refresh Requests">
            <IconButton onClick={fetchManagers} size="small" sx={{ mr: 1 }}>
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        }
        sx={{ pb: 1 }}
      />

      <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
        <Tabs value={activeTab} onChange={(e, val) => setActiveTab(val)}>
          <Tab
            label={
              <Stack direction="row" alignItems="center" spacing={1}>
                <span>Pending Requests</span>
                {pendingManagers.length > 0 && (
                  <Chip
                    label={pendingManagers.length}
                    size="small"
                    sx={{ height: 20, fontSize: '0.7rem', bgcolor: '#fef3c7', color: '#92400e', fontWeight: 700 }}
                  />
                )}
              </Stack>
            }
          />
          <Tab label={`Manager Directory (${otherManagers.length})`} />
        </Tabs>
      </Box>

      <CardContent sx={{ p: 0 }}>
        {loading ? (
          <Box sx={{ py: 6, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <CircularProgress size={32} sx={{ color: '#059669' }} />
          </Box>
        ) : activeTab === 0 ? (
          // Tab 0: Pending Requests
          pendingManagers.length === 0 ? (
            <Box sx={{ py: 6, px: 3, textAlign: 'center' }}>
              <PendingIcon sx={{ fontSize: 44, color: '#94a3b8', mb: 1.5 }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#475569' }}>
                No Pending Manager Requests
              </Typography>
              <Typography variant="body2" sx={{ color: '#94a3b8', maxWidth: 450, mx: 'auto', mt: 0.5 }}>
                New sales managers who sign up on the public registration page will appear here for your review and approval.
              </Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table size="medium">
                <TableHead sx={{ bgcolor: '#f8fafc' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600, color: '#64748b', fontSize: '0.8125rem' }}>Manager Details</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: '#64748b', fontSize: '0.8125rem' }}>Requested Store</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: '#64748b', fontSize: '0.8125rem' }}>Signup Date</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: '#64748b', fontSize: '0.8125rem' }}>Status</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, color: '#64748b', fontSize: '0.8125rem' }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pendingManagers.map((mgr) => (
                    <TableRow key={mgr._id || mgr.id} hover>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#0f172a' }}>
                          {mgr.name}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                          {mgr.email}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <StoreIcon fontSize="small" sx={{ color: '#059669' }} />
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 600, color: '#1e293b' }}>
                              {mgr.storeCode || 'Unassigned'}
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#64748b' }}>
                              {STORE_LABELS[mgr.storeCode] || 'Retail Branch'}
                            </Typography>
                          </Box>
                        </Stack>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ color: '#475569' }}>
                          {mgr.createdAt ? new Date(mgr.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'Just now'}
                        </Typography>
                      </TableCell>
                      <TableCell>{getStatusChip(mgr.status)}</TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                          <Button
                            size="small"
                            variant="contained"
                            color="success"
                            startIcon={<ApproveIcon />}
                            disabled={actionLoading}
                            onClick={() => handleApprove(mgr)}
                            sx={{ fontWeight: 600, textTransform: 'none' }}
                          >
                            Approve
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            startIcon={<RejectIcon />}
                            disabled={actionLoading}
                            onClick={() => handleOpenRejectDialog(mgr)}
                            sx={{ fontWeight: 600, textTransform: 'none' }}
                          >
                            Reject
                          </Button>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )
        ) : (
          // Tab 1: All Other Managers
          otherManagers.length === 0 ? (
            <Box sx={{ py: 6, textAlign: 'center' }}>
              <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                No active or historical managers found.
              </Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table size="medium">
                <TableHead sx={{ bgcolor: '#f8fafc' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600, color: '#64748b', fontSize: '0.8125rem' }}>Manager</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: '#64748b', fontSize: '0.8125rem' }}>Assigned Store</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: '#64748b', fontSize: '0.8125rem' }}>Decision Audit</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: '#64748b', fontSize: '0.8125rem' }}>Status</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, color: '#64748b', fontSize: '0.8125rem' }}>Access Control</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {otherManagers.map((mgr) => (
                    <TableRow key={mgr._id || mgr.id} hover>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#0f172a' }}>
                          {mgr.name}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#64748b' }}>
                          {mgr.email}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          icon={<StoreIcon style={{ fontSize: 16 }} />}
                          label={mgr.storeCode || 'N/A'}
                          size="small"
                          variant="outlined"
                          sx={{ fontWeight: 600 }}
                        />
                      </TableCell>
                      <TableCell>
                        {mgr.status === 'approved' && mgr.approvedAt && (
                          <Typography variant="caption" sx={{ color: '#166534', display: 'block' }}>
                            Approved: {new Date(mgr.approvedAt).toLocaleDateString()}
                          </Typography>
                        )}
                        {mgr.status === 'rejected' && mgr.rejectedAt && (
                          <Typography variant="caption" sx={{ color: '#991b1b', display: 'block' }}>
                            Rejected: {new Date(mgr.rejectedAt).toLocaleDateString()} ({mgr.rejectionReason || 'No reason'})
                          </Typography>
                        )}
                        {mgr.status === 'disabled' && mgr.disabledAt && (
                          <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                            Disabled: {new Date(mgr.disabledAt).toLocaleDateString()}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>{getStatusChip(mgr.status)}</TableCell>
                      <TableCell align="right">
                        {mgr.status === 'approved' ? (
                          <Button
                            size="small"
                            variant="outlined"
                            color="error"
                            startIcon={<DisableIcon />}
                            disabled={actionLoading}
                            onClick={() => handleDisable(mgr)}
                            sx={{ fontWeight: 600, textTransform: 'none' }}
                          >
                            Disable Access
                          </Button>
                        ) : mgr.status === 'disabled' ? (
                          <Button
                            size="small"
                            variant="contained"
                            color="success"
                            startIcon={<ApproveIcon />}
                            disabled={actionLoading}
                            onClick={() => handleApprove(mgr)}
                            sx={{ fontWeight: 600, textTransform: 'none' }}
                          >
                            Re-Approve
                          </Button>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )
        )}
      </CardContent>

      {/* Rejection Dialog */}
      <Dialog open={rejectDialogOpen} onClose={() => setRejectDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Reject Manager Application</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            Are you sure you want to reject the application for <strong>{selectedManager?.name}</strong> ({selectedManager?.email})?
            They will not be permitted to sign in.
          </DialogContentText>
          <TextField
            autoFocus
            label="Reason for Rejection (Optional)"
            fullWidth
            variant="outlined"
            size="small"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="e.g. Identity could not be verified"
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setRejectDialogOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button
            onClick={handleConfirmReject}
            color="error"
            variant="contained"
            disabled={actionLoading}
          >
            Confirm Rejection
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar feedback */}
      <Snackbar
        open={Boolean(feedback)}
        autoHideDuration={4000}
        onClose={() => setFeedback(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        {feedback && (
          <Alert onClose={() => setFeedback(null)} severity={feedback.severity} sx={{ width: '100%' }}>
            {feedback.message}
          </Alert>
        )}
      </Snackbar>
    </Card>
  );
}
