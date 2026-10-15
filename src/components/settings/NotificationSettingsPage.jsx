/**
 * Storelistener — Smart Alerts & Notification Settings (Module 8)
 * File: src/components/settings/NotificationSettingsPage.jsx
 *
 * Implements:
 * 1. Rule configuration for the 8 operational event types
 * 2. Inactivity threshold configuration (minutes)
 * 3. Severity customization per rule
 * 4. Optional email delivery channel preferences
 * 5. Persistent settings synchronization via PUT /api/notifications/settings
 * 6. Live alert trigger tester
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Stack,
  Card,
  CardHeader,
  CardContent,
  Button,
  Switch,
  FormControlLabel,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Divider,
  Alert,
  Snackbar,
  CircularProgress,
  Chip,
  Paper,
} from '@mui/material';
import {
  NotificationsActive as AlertIcon,
  Save as SaveIcon,
  Refresh as RefreshIcon,
  PictureAsPdf as PdfIcon,
  Email as EmailIcon,
  CheckCircle as SuccessIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Timer as TimerIcon,
  Send as SendIcon,
} from '@mui/icons-material';

import { BACKEND_URL } from '../../config/api';
import { downloadNotificationsReport } from '../../utils/pdfReportService';

const RULE_METADATA = [
  {
    key: 'store_offline',
    title: 'Store Desktop Disconnected',
    description: 'Triggers when a counter desktop application loses connection or heartbeat goes stale (>15s).',
    defaultSeverity: 'error',
  },
  {
    key: 'store_online',
    title: 'Store Desktop Connected',
    description: 'Triggers when a counter application reconnects and emits its first heartbeat.',
    defaultSeverity: 'info',
  },
  {
    key: 'conversation_started',
    title: 'New Conversation Started',
    description: 'Triggers when sustained speech activates an active recording session at a counter.',
    defaultSeverity: 'info',
  },
  {
    key: 'conversation_completed',
    title: 'Conversation Completed',
    description: 'Triggers when a conversation completes after 15 seconds of silence and saves transcripts.',
    defaultSeverity: 'info',
  },
  {
    key: 'sale_confirmed',
    title: 'Confirmed Sale Finalized 🎉',
    description: 'Triggers when deal analysis identifies an explicit transaction or payment commitment.',
    defaultSeverity: 'success',
  },
  {
    key: 'follow_up_required',
    title: 'Follow-up Required',
    description: 'Triggers when a consultation leaves with pending interest requiring scheduled contact.',
    defaultSeverity: 'warning',
  },
  {
    key: 'high_intent_unclear_outcome',
    title: 'High Intent — Unclear Outcome',
    description: 'Triggers when customer exhibited high purchase intent but conversation lacked a confirmed outcome.',
    defaultSeverity: 'warning',
  },
  {
    key: 'analysis_failure',
    title: 'Analysis / Assessment Failed',
    description: 'Triggers if automated AI analysis or scorecard evaluation encounters a backend failure.',
    defaultSeverity: 'error',
  },
  {
    key: 'store_inactivity',
    title: 'Store Inactivity Alert',
    description: 'Triggers when an online retail store records no customer dialogue beyond the threshold.',
    defaultSeverity: 'warning',
    hasThreshold: true,
  },
];

export default function NotificationSettingsPage({ token, currentUser }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);
  const [testTriggerLoading, setTestTriggerLoading] = useState(false);

  const [settings, setSettings] = useState({
    rules: {
      store_offline: { enabled: true, severity: 'error' },
      store_online: { enabled: true, severity: 'info' },
      conversation_started: { enabled: true, severity: 'info' },
      conversation_completed: { enabled: true, severity: 'info' },
      sale_confirmed: { enabled: true, severity: 'success' },
      follow_up_required: { enabled: true, severity: 'warning' },
      high_intent_unclear_outcome: { enabled: true, severity: 'warning' },
      analysis_failure: { enabled: true, severity: 'error' },
      store_inactivity: { enabled: true, severity: 'warning', thresholdMinutes: 60 },
    },
    emailDelivery: {
      enabled: false,
      recipientEmail: '',
    },
  });

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const authToken = token || localStorage.getItem('storelistener_token');
      const res = await fetch(`${BACKEND_URL}/api/notifications/settings`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
      });
      const data = await res.json();
      if (data.success && data.settings) {
        setSettings(data.settings);
      }
    } catch (err) {
      console.warn('Failed to load settings:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleRuleToggle = (ruleKey) => {
    setSettings((prev) => ({
      ...prev,
      rules: {
        ...prev.rules,
        [ruleKey]: {
          ...prev.rules[ruleKey],
          enabled: !prev.rules[ruleKey]?.enabled,
        },
      },
    }));
  };

  const handleSeverityChange = (ruleKey, newSeverity) => {
    setSettings((prev) => ({
      ...prev,
      rules: {
        ...prev.rules,
        [ruleKey]: {
          ...prev.rules[ruleKey],
          severity: newSeverity,
        },
      },
    }));
  };

  const handleThresholdChange = (ruleKey, newThreshold) => {
    const val = parseInt(newThreshold, 10);
    setSettings((prev) => ({
      ...prev,
      rules: {
        ...prev.rules,
        [ruleKey]: {
          ...prev.rules[ruleKey],
          thresholdMinutes: isNaN(val) ? 60 : Math.max(5, Math.min(1440, val)),
        },
      },
    }));
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const authToken = token || localStorage.getItem('storelistener_token');
      const res = await fetch(`${BACKEND_URL}/api/notifications/settings`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (data.success) {
        setToastMessage('✅ Notification alert rules and thresholds saved successfully.');
      } else {
        throw new Error(data.error || 'Failed to save settings');
      }
    } catch (err) {
      setToastMessage(`❌ Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleTriggerTestAlert = async (type) => {
    setTestTriggerLoading(true);
    try {
      const authToken = token || localStorage.getItem('storelistener_token');
      const res = await fetch(`${BACKEND_URL}/api/notifications/trigger-test`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({
          idempotencyKey: `test_alert_${type}_${Date.now()}`,
          type,
          title: `Test Alert — ${type.replace(/_/g, ' ').toUpperCase()}`,
          description: `This is an operational demonstration alert triggered on demand from the owner settings workspace.`,
          severity: settings.rules[type]?.severity || 'info',
          storeCode: 'STORE-01',
          storeName: 'iPhone Store 01 (5th Ave)',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setToastMessage(`🔔 Dispatched test alert: ${type}`);
      }
    } catch (err) {
      setToastMessage(`❌ Test alert error: ${err.message}`);
    } finally {
      setTestTriggerLoading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems="flex-start" sx={{ mb: 3 }} spacing={2}>
        <Box>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary', letterSpacing: '-0.02em' }}>
              Smart Alerts & Notification Settings
            </Typography>
            <Chip
              size="small"
              icon={<AlertIcon sx={{ fontSize: '14px !important', color: '#16A34A !important' }} />}
              label="Alert Engine Active"
              sx={{ bgcolor: '#F0FDF4', color: '#15803D', borderColor: '#BBF7D0', borderWidth: 1, borderStyle: 'solid', fontWeight: 600 }}
            />
          </Stack>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
            Configure real-time alert triggers, inactivity thresholds, and delivery preferences across all 3 retail branches.
          </Typography>
        </Box>

        <Stack direction="row" spacing={1.5}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<RefreshIcon />}
            onClick={fetchSettings}
            disabled={loading}
            sx={{ fontWeight: 600 }}
          >
            Reset
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={<PdfIcon />}
            disabled={loading}
            onClick={async () => {
              try {
                const authToken = token || localStorage.getItem('storelistener_token');
                const notifsRes = await fetch(`${BACKEND_URL}/api/notifications?limit=50`, {
                  credentials: 'include',
                  headers: { ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}) },
                });
                const notifsData = await notifsRes.json();
                downloadNotificationsReport({
                  notifications: notifsData.notifications || [],
                  unreadCount: notifsData.unreadCount || 0,
                  settings,
                  currentUser,
                });
                setToastMessage('✓ Smart Alerts & Notifications audit report downloaded.');
              } catch (err) {
                console.error('PDF export error:', err);
                setToastMessage(`Failed to export PDF: ${err.message}`);
              }
            }}
            sx={{ fontWeight: 600 }}
          >
            Download PDF
          </Button>
          <Button
            variant="contained"
            size="small"
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
            onClick={handleSaveSettings}
            disabled={saving || loading}
            sx={{ fontWeight: 600 }}
          >
            Save Changes
          </Button>
        </Stack>
      </Stack>

      {/* Alert Rules Section */}
      <Card elevation={0} sx={{ borderRadius: 2.5, border: '1px solid', borderColor: 'divider', mb: 4 }}>
        <CardHeader
          title={<Typography variant="h6" sx={{ fontWeight: 700 }}>Operational Alert Rules</Typography>}
          subheader="Enable or disable specific event alerts and select their severity level. Rules with disabled toggles will not create notifications."
        />
        <Divider />

        <CardContent sx={{ p: 0 }}>
          {loading ? (
            <Box sx={{ p: 6, textAlign: 'center' }}>
              <CircularProgress size={32} />
              <Typography variant="body2" sx={{ color: 'text.secondary', mt: 2 }}>Loading settings...</Typography>
            </Box>
          ) : (
            RULE_METADATA.map((rule, idx) => {
              const ruleConfig = settings.rules[rule.key] || { enabled: true, severity: rule.defaultSeverity };
              const isEnabled = ruleConfig.enabled !== false;

              return (
                <Box
                  key={rule.key}
                  sx={{
                    p: 2.5,
                    borderBottom: idx < RULE_METADATA.length - 1 ? '1px solid' : 'none',
                    borderColor: 'divider',
                    bgcolor: isEnabled ? 'transparent' : '#F8FAFC',
                    opacity: isEnabled ? 1 : 0.65,
                    transition: 'all 0.2s',
                  }}
                >
                  <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} sm={6} md={7}>
                      <Stack direction="row" spacing={2} alignItems="flex-start">
                        <FormControlLabel
                          control={
                            <Switch
                              checked={isEnabled}
                              onChange={() => handleRuleToggle(rule.key)}
                              color="primary"
                            />
                          }
                          label=""
                          sx={{ m: 0, mt: 0.25 }}
                        />
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                            {rule.title}
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.25 }}>
                            {rule.description}
                          </Typography>
                        </Box>
                      </Stack>
                    </Grid>

                    <Grid item xs={12} sm={6} md={5}>
                      <Stack direction="row" spacing={1.5} alignItems="center" justifyContent={{ sm: 'flex-end' }}>
                        {rule.hasThreshold && (
                          <TextField
                            size="small"
                            type="number"
                            label="Threshold (Mins)"
                            value={ruleConfig.thresholdMinutes || 60}
                            onChange={(e) => handleThresholdChange(rule.key, e.target.value)}
                            disabled={!isEnabled}
                            sx={{ width: 130 }}
                            inputProps={{ min: 5, max: 1440 }}
                          />
                        )}

                        <FormControl size="small" sx={{ width: 130 }} disabled={!isEnabled}>
                          <InputLabel id={`severity-${rule.key}-label`}>Severity</InputLabel>
                          <Select
                            labelId={`severity-${rule.key}-label`}
                            value={ruleConfig.severity || rule.defaultSeverity}
                            label="Severity"
                            onChange={(e) => handleSeverityChange(rule.key, e.target.value)}
                          >
                            <MenuItem value="info">Info</MenuItem>
                            <MenuItem value="success">Success</MenuItem>
                            <MenuItem value="warning">Warning</MenuItem>
                            <MenuItem value="error">Error</MenuItem>
                          </Select>
                        </FormControl>

                        <Button
                          size="small"
                          variant="outlined"
                          disabled={!isEnabled || testTriggerLoading}
                          onClick={() => handleTriggerTestAlert(rule.key)}
                          sx={{ textTransform: 'none', fontSize: '0.75rem', height: 38 }}
                        >
                          Test
                        </Button>
                      </Stack>
                    </Grid>
                  </Grid>
                </Box>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Optional Email Delivery Channel */}
      <Card elevation={0} sx={{ borderRadius: 2.5, border: '1px solid', borderColor: 'divider', mb: 4 }}>
        <CardHeader
          avatar={<EmailIcon sx={{ color: 'primary.main' }} />}
          title={<Typography variant="h6" sx={{ fontWeight: 700 }}>Optional Email Notification Channel</Typography>}
          subheader="Configure automated email summaries for critical alert events. Email delivery is simulated safely if external SMTP credentials are not active."
        />
        <Divider />
        <CardContent sx={{ p: 3 }}>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={4}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.emailDelivery?.enabled || false}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        emailDelivery: {
                          ...prev.emailDelivery,
                          enabled: e.target.checked,
                        },
                      }))
                    }
                  />
                }
                label={
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Enable Email Forwarding</Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>Receive critical notifications via email</Typography>
                  </Box>
                }
              />
            </Grid>

            <Grid item xs={12} md={8}>
              <TextField
                fullWidth
                size="small"
                label="Recipient Email Address"
                placeholder="owner@storelistener.com"
                value={settings.emailDelivery?.recipientEmail || ''}
                disabled={!settings.emailDelivery?.enabled}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    emailDelivery: {
                      ...prev.emailDelivery,
                      recipientEmail: e.target.value,
                    },
                  }))
                }
              />
            </Grid>
          </Grid>

          <Alert severity="info" sx={{ mt: 2.5, fontSize: '0.8125rem' }}>
            <strong>Production SMTP Configuration Note: </strong>
            To connect a dedicated transactional SMTP service in production, provide <code>SMTP_HOST</code>, <code>SMTP_PORT</code>, <code>SMTP_USER</code>, and <code>SMTP_PASS</code> in the backend environment. In-app alerts remain permanently active independently.
          </Alert>
        </CardContent>
      </Card>

      {/* Feedback Toast */}
      <Snackbar
        open={Boolean(toastMessage)}
        autoHideDuration={4000}
        onClose={() => setToastMessage(null)}
        message={toastMessage}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      />
    </Box>
  );
}
