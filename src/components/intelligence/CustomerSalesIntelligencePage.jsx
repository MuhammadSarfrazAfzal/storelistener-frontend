/**
 * Storelistener — Customer & Sales Intelligence Dashboard (Module 9)
 * File: src/components/intelligence/CustomerSalesIntelligencePage.jsx
 *
 * Implements:
 * 1. Product Demand Intelligence with distinct conversation counts & intent classification
 * 2. Lost-Sale & Price Objection Analysis with verifiable quotes and "Reason not identified"
 * 3. Store Comparison with transparent denominators (excluding unclear outcomes from confirmed sales)
 * 4. Aggregated Customer Requirements & Follow-up Opportunities (privacy-preserving)
 * 5. Multi-dimensional filtering (Store, Date Range, Product)
 * 6. Drill-down evidence inspection dialog
 * 7. Verified CSV Export matching active filters
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Grid,
  Stack,
  Card,
  CardHeader,
  CardContent,
  Button,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
  Divider,
  LinearProgress,
  Alert,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Psychology as IntelligenceIcon,
  Download as ExportIcon,
  Refresh as RefreshIcon,
  CheckCircle as SaleConfirmedIcon,
  HourglassEmpty as FollowUpIcon,
  Cancel as NotConvertedIcon,
  HelpOutline as UnclearIcon,
  Storefront as StoreIcon,
  AttachMoney as PriceIcon,
  Inventory2Outlined as ProductIcon,
  WarningAmber as ObjectionIcon,
  TrendingUp as TrendingIcon,
  AssignmentTurnedIn as RequirementIcon,
  Close as CloseIcon,
  InfoOutlined as InfoIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';

import { BACKEND_URL } from '../../config/api';

export default function CustomerSalesIntelligencePage({ currentUser, token, onNavigate }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(0); // 0: Products, 1: Lost Sales & Objections, 2: Stores, 3: Customer Needs, 4: Trends

  // Filters
  const [selectedStore, setSelectedStore] = useState('all');
  const [dateRange, setDateRange] = useState('30d');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('all');

  // Stores for filter dropdown
  const [availableStores, setAvailableStores] = useState([]);

  // Data payload from API
  const [intelligenceData, setIntelligenceData] = useState(null);

  // Evidence Drill-down Modal State
  const [drilldownModal, setDrilldownModal] = useState({
    open: false,
    title: '',
    type: '', // 'product' | 'objection' | 'requirement'
    data: null,
  });

  // Fetch available stores
  useEffect(() => {
    const fetchStores = async () => {
      try {
        const authToken = token || localStorage.getItem('storelistener_token');
        const res = await fetch(`${BACKEND_URL}/api/stores`, {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
          },
        });
        const data = await res.json();
        if (data.success && Array.isArray(data.stores)) {
          setAvailableStores(data.stores);
        }
      } catch (e) {
        console.warn('Failed to load stores:', e.message);
      }
    };
    fetchStores();
  }, [token]);

  // Main intelligence data fetch
  const fetchIntelligenceData = async () => {
    setLoading(true);
    setError(null);
    try {
      const authToken = token || localStorage.getItem('storelistener_token');
      const queryParams = new URLSearchParams();
      if (selectedStore && selectedStore !== 'all') queryParams.append('storeCode', selectedStore);
      if (dateRange) queryParams.append('dateRange', dateRange);
      if (dateRange === 'custom') {
        if (startDate) queryParams.append('startDate', startDate);
        if (endDate) queryParams.append('endDate', endDate);
      }
      if (selectedProduct && selectedProduct !== 'all') queryParams.append('product', selectedProduct);

      const res = await fetch(`${BACKEND_URL}/api/intelligence/overview?${queryParams.toString()}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
      });

      const data = await res.json();
      if (data.success) {
        setIntelligenceData(data);
      } else {
        setError(data.error || 'Failed to retrieve sales intelligence data');
      }
    } catch (err) {
      setError(err.message || 'Network connection failed while fetching intelligence');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIntelligenceData();
  }, [selectedStore, dateRange, startDate, endDate, selectedProduct]);

  // CSV Export handler
  const handleExportCSV = async () => {
    try {
      const authToken = token || localStorage.getItem('storelistener_token');
      const queryParams = new URLSearchParams();
      if (selectedStore && selectedStore !== 'all') queryParams.append('storeCode', selectedStore);
      if (dateRange) queryParams.append('dateRange', dateRange);
      if (dateRange === 'custom') {
        if (startDate) queryParams.append('startDate', startDate);
        if (endDate) queryParams.append('endDate', endDate);
      }
      if (selectedProduct && selectedProduct !== 'all') queryParams.append('product', selectedProduct);

      const res = await fetch(`${BACKEND_URL}/api/intelligence/export-csv?${queryParams.toString()}`, {
        credentials: 'include',
        headers: {
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
      });

      if (!res.ok) throw new Error('Failed to generate intelligence CSV');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sales_intelligence_report_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (e) {
      alert(`Export error: ${e.message}`);
    }
  };

  const summary = intelligenceData?.summary || {
    totalEligibleConversations: 0,
    confirmedSalesCount: 0,
    followUpsCount: 0,
    unconvertedCount: 0,
    unclearOutcomesCount: 0,
    conversionRate: 0,
    resolvedConversionRate: null,
    totalUniqueProducts: 0,
  };

  const productDemand = intelligenceData?.productDemand || [];
  const storeComparison = intelligenceData?.storeComparison || [];
  const lostSalesAndObjections = intelligenceData?.lostSalesAndObjections || [];
  const customerRequirements = intelligenceData?.customerRequirements || [];
  const demandTrends = intelligenceData?.demandTrends || [];

  return (
    <Box sx={{ p: { xs: 2, sm: 3, md: 4 }, maxWidth: 1400, mx: 'auto' }}>
      {/* Page Header */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Box>
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2,
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <IntelligenceIcon />
            </Box>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700, letterSpacing: '-0.02em' }}>
                Customer & Sales Intelligence
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Product demand rankings, lost-sale objections, and store comparison derived from real customer dialogue
              </Typography>
            </Box>
          </Stack>
        </Box>

        <Stack direction="row" spacing={1.5} alignItems="center">
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchIntelligenceData}
            disabled={loading}
            size="small"
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<ExportIcon />}
            onClick={handleExportCSV}
            disabled={loading || summary.totalEligibleConversations === 0}
            size="small"
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            Export CSV
          </Button>
        </Stack>
      </Stack>

      {/* Filter Toolbar */}
      <Paper
        elevation={0}
        sx={{
          p: 2.5,
          mb: 3,
          borderRadius: 2.5,
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        <Grid container spacing={2} alignItems="center">
          {/* Store Filter */}
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <FormControl fullWidth size="small">
              <InputLabel id="store-select-label">Store Location</InputLabel>
              <Select
                labelId="store-select-label"
                value={selectedStore}
                label="Store Location"
                onChange={(e) => setSelectedStore(e.target.value)}
              >
                <MenuItem value="all">All Retail Locations</MenuItem>
                {availableStores.map((store) => (
                  <MenuItem key={store.storeCode} value={store.storeCode}>
                    {store.name} ({store.storeCode})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Date Range Filter */}
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <FormControl fullWidth size="small">
              <InputLabel id="date-range-label">Time Period</InputLabel>
              <Select
                labelId="date-range-label"
                value={dateRange}
                label="Time Period"
                onChange={(e) => setDateRange(e.target.value)}
              >
                <MenuItem value="today">Today</MenuItem>
                <MenuItem value="7d">Last 7 Days</MenuItem>
                <MenuItem value="30d">Last 30 Days</MenuItem>
                <MenuItem value="90d">Last 90 Days</MenuItem>
                <MenuItem value="all">All Available Records</MenuItem>
                <MenuItem value="custom">Custom Date Range</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {/* Custom Date Pickers */}
          {dateRange === 'custom' && (
            <>
              <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Start Date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="End Date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Grid>
            </>
          )}

          {/* Product Filter */}
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <FormControl fullWidth size="small">
              <InputLabel id="product-filter-label">Filter by Product</InputLabel>
              <Select
                labelId="product-filter-label"
                value={selectedProduct}
                label="Filter by Product"
                onChange={(e) => setSelectedProduct(e.target.value)}
              >
                <MenuItem value="all">All Products</MenuItem>
                {productDemand.map((prod) => (
                  <MenuItem key={prod.productName} value={prod.productName}>
                    {prod.productName} ({prod.distinctConversations})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      {/* KPI Overview Metric Cards */}
      <Grid container spacing={2.5} sx={{ mb: 3.5 }}>
        {/* Total Conversations */}
        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2.5, height: '100%' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase' }}>
                Total Analyzed
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, my: 0.5, color: 'text.primary' }}>
                {summary.totalEligibleConversations}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Completed dialogues
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Confirmed Sales & Conversion */}
        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2.5, height: '100%' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase' }}>
                  Confirmed Sales
                </Typography>
                <Tooltip title={summary.conversionMetricDisclosure || ''} arrow>
                  <InfoIcon sx={{ fontSize: 16, color: 'text.secondary', cursor: 'help' }} />
                </Tooltip>
              </Stack>
              <Typography variant="h4" sx={{ fontWeight: 700, my: 0.5, color: '#15803D' }}>
                {summary.confirmedSalesCount}
              </Typography>
              <Stack direction="row" spacing={0.5} alignItems="center">
                <Chip
                  label={`${summary.conversionRate}% conv.`}
                  size="small"
                  sx={{ height: 20, fontSize: '0.6875rem', fontWeight: 700, bgcolor: '#F0FDF4', color: '#15803D' }}
                />
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  of total sessions
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* Follow-up Opportunities */}
        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2.5, height: '100%' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase' }}>
                Follow-ups Required
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, my: 0.5, color: '#B45309' }}>
                {summary.followUpsCount}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Active callback leads
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Unconverted Deals */}
        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2.5, height: '100%' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase' }}>
                Unconverted Deals
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, my: 0.5, color: '#B91C1C' }}>
                {summary.unconvertedCount}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {summary.unclearOutcomesCount > 0 ? `+ ${summary.unclearOutcomesCount} unclear` : 'Lost conversations'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Products in Demand */}
        <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
          <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2.5, height: '100%' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase' }}>
                Products Tracked
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, my: 0.5, color: 'primary.main' }}>
                {summary.totalUniqueProducts}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Discussed models
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Conversion Metric Disclosure Banner */}
      <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
        <Typography variant="caption" sx={{ fontWeight: 500 }}>
          <strong>Conversion Metric Integrity:</strong> {summary.conversionMetricDisclosure}
        </Typography>
      </Alert>

      {/* Tabs Navigation */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(e, val) => setActiveTab(val)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            '& .MuiTab-root': {
              fontWeight: 600,
              textTransform: 'none',
              fontSize: '0.9375rem',
              minHeight: 48,
            },
          }}
        >
          <Tab icon={<ProductIcon sx={{ fontSize: 18 }} />} iconPosition="start" label={`Product Demand (${productDemand.length})`} />
          <Tab icon={<ObjectionIcon sx={{ fontSize: 18 }} />} iconPosition="start" label={`Lost Sales & Objections (${lostSalesAndObjections.length})`} />
          <Tab icon={<StoreIcon sx={{ fontSize: 18 }} />} iconPosition="start" label={`Store Comparison (${storeComparison.length})`} />
          <Tab icon={<RequirementIcon sx={{ fontSize: 18 }} />} iconPosition="start" label={`Customer Needs & Follow-ups (${customerRequirements.length})`} />
          <Tab icon={<TrendingIcon sx={{ fontSize: 18 }} />} iconPosition="start" label={`Demand Trends (${demandTrends.length} days)`} />
        </Tabs>
      </Box>

      {/* Loading & Error States */}
      {loading ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 8 }}>
          <CircularProgress size={36} sx={{ mb: 2 }} />
          <Typography variant="body2" color="text.secondary">
            Aggregating customer and sales intelligence records...
          </Typography>
        </Box>
      ) : error ? (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      ) : summary.totalEligibleConversations === 0 ? (
        <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2.5, p: 6, textAlign: 'center' }}>
          <ProductIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1.5 }} />
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
            No Intelligence Data Found
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 460, mx: 'auto', mb: 2 }}>
            No completed conversations match the selected store location and date filter. Try widening the date range.
          </Typography>
          <Button variant="outlined" onClick={() => { setSelectedStore('all'); setDateRange('all'); setSelectedProduct('all'); }}>
            Reset Filters
          </Button>
        </Card>
      ) : (
        <>
          {/* TAB 0: PRODUCT DEMAND INTELLIGENCE */}
          {activeTab === 0 && (
            <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2.5 }}>
              <CardHeader
                title={<Typography variant="h6" sx={{ fontWeight: 700 }}>Product Demand Rankings</Typography>}
                subheader="Aggregated from distinct conversations, classifying explicit purchase intent vs casual inquiries"
              />
              <Divider />
              <TableContainer>
                <Table size="medium">
                  <TableHead sx={{ bgcolor: 'grey.50' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Product / Model</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700 }}>Distinct Conversations</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700 }}>Demand Intent Breakdown</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Price / Budget Ranges</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Top Questions & Objections</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {productDemand.map((prod) => (
                      <TableRow key={prod.productName} hover>
                        <TableCell>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                            {prod.productName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {Object.entries(prod.storeWiseDemand || {})
                              .map(([st, c]) => `${st}: ${c}`)
                              .join(' • ')}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={`${prod.distinctConversations} sessions`}
                            size="small"
                            sx={{ fontWeight: 700, bgcolor: 'primary.50', color: 'primary.main' }}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Stack direction="row" spacing={0.75} justifyContent="center">
                            <Tooltip title="Explicit Purchase Intent / Confirmed Sale">
                              <Chip
                                label={`Sale/High: ${prod.explicitPurchaseIntent}`}
                                size="small"
                                sx={{ height: 22, fontSize: '0.6875rem', fontWeight: 600, bgcolor: '#F0FDF4', color: '#15803D' }}
                              />
                            </Tooltip>
                            <Tooltip title="Genuine Interest / Consultation">
                              <Chip
                                label={`Med: ${prod.genuineInterest}`}
                                size="small"
                                sx={{ height: 22, fontSize: '0.6875rem', fontWeight: 600, bgcolor: '#EFF6FF', color: '#1D4ED8' }}
                              />
                            </Tooltip>
                            <Tooltip title="Casual Mention / Low Intent">
                              <Chip
                                label={`Low: ${prod.casualMention}`}
                                size="small"
                                sx={{ height: 22, fontSize: '0.6875rem', fontWeight: 600, bgcolor: '#F3F4F6', color: '#4B5563' }}
                              />
                            </Tooltip>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          {prod.priceRanges && prod.priceRanges.length > 0 ? (
                            <Stack direction="row" spacing={0.5} flexWrap="wrap">
                              {prod.priceRanges.slice(0, 2).map((p, i) => (
                                <Chip key={i} label={p} size="small" variant="outlined" sx={{ fontSize: '0.6875rem' }} />
                              ))}
                            </Stack>
                          ) : (
                            <Typography variant="caption" color="text.secondary">Not mentioned</Typography>
                          )}
                        </TableCell>
                        <TableCell sx={{ maxWidth: 320 }}>
                          {prod.commonQuestions?.length > 0 ? (
                            <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                              <strong>Q:</strong> {prod.commonQuestions[0]}
                            </Typography>
                          ) : null}
                          {prod.commonObjections?.length > 0 ? (
                            <Typography variant="caption" sx={{ display: 'block', color: '#B91C1C' }}>
                              <strong>Obj:</strong> {prod.commonObjections[0]}
                            </Typography>
                          ) : null}
                          {!prod.commonQuestions?.length && !prod.commonObjections?.length && (
                            <Typography variant="caption" color="text.secondary">None recorded</Typography>
                          )}
                        </TableCell>
                        <TableCell align="right">
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<ViewIcon />}
                            onClick={() =>
                              setDrilldownModal({
                                open: true,
                                title: `Product Demand Evidence: ${prod.productName}`,
                                type: 'product',
                                data: prod,
                              })
                            }
                            sx={{ textTransform: 'none', fontSize: '0.75rem', fontWeight: 600 }}
                          >
                            Evidence ({prod.evidenceQuotes?.length || 0})
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Card>
          )}

          {/* TAB 1: LOST SALES & OBJECTIONS */}
          {activeTab === 1 && (
            <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2.5 }}>
              <CardHeader
                title={<Typography variant="h6" sx={{ fontWeight: 700 }}>Lost-Sale and Objection Intelligence</Typography>}
                subheader="Identifies why deals did not convert, supported by verifiable quotes without invented reasons"
              />
              <Divider />
              <TableContainer>
                <Table size="medium">
                  <TableHead sx={{ bgcolor: 'grey.50' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Objection / Reason Category</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700 }}>Occurrences</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Supporting Evidence Excerpt</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {lostSalesAndObjections.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                          <Typography variant="body2" color="text.secondary">
                            No lost sales or objections recorded in the selected period.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      lostSalesAndObjections.map((cat, idx) => (
                        <TableRow key={idx} hover>
                          <TableCell>
                            <Stack direction="row" spacing={1} alignItems="center">
                              {cat.category === 'Price / Budget Constraint' ? (
                                <PriceIcon sx={{ color: '#B45309', fontSize: 20 }} />
                              ) : cat.category === 'Reason not identified' ? (
                                <UnclearIcon sx={{ color: '#6B7280', fontSize: 20 }} />
                              ) : (
                                <ObjectionIcon sx={{ color: '#B91C1C', fontSize: 20 }} />
                              )}
                              <Box>
                                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                                  {cat.category}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {cat.category === 'Reason not identified'
                                    ? 'Customer walked away without recording an explicit reason'
                                    : 'Explicitly raised during customer conversation'}
                                </Typography>
                              </Box>
                            </Stack>
                          </TableCell>
                          <TableCell align="center">
                            <Chip
                              label={`${cat.count} instances`}
                              size="small"
                              sx={{
                                fontWeight: 700,
                                bgcolor: cat.category === 'Reason not identified' ? '#F3F4F6' : '#FEF2F2',
                                color: cat.category === 'Reason not identified' ? '#4B5563' : '#B91C1C',
                              }}
                            />
                          </TableCell>
                          <TableCell sx={{ maxWidth: 450 }}>
                            {cat.evidenceQuotes && cat.evidenceQuotes.length > 0 ? (
                              <Typography variant="caption" sx={{ fontStyle: 'italic', color: 'text.secondary' }}>
                                "{cat.evidenceQuotes[0].quote}" — [{cat.evidenceQuotes[0].storeCode} / {cat.evidenceQuotes[0].salesRep}]
                              </Typography>
                            ) : (
                              <Typography variant="caption" color="text.secondary">No quote available</Typography>
                            )}
                          </TableCell>
                          <TableCell align="right">
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<ViewIcon />}
                              onClick={() =>
                                setDrilldownModal({
                                  open: true,
                                  title: `Objection Evidence: ${cat.category}`,
                                  type: 'objection',
                                  data: cat,
                                })
                              }
                              sx={{ textTransform: 'none', fontSize: '0.75rem', fontWeight: 600 }}
                            >
                              Quotes ({cat.evidenceQuotes?.length || 0})
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Card>
          )}

          {/* TAB 2: STORE COMPARISON */}
          {activeTab === 2 && (
            <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2.5 }}>
              <CardHeader
                title={<Typography variant="h6" sx={{ fontWeight: 700 }}>Retail Store Comparison</Typography>}
                subheader="Comparative benchmark with transparent denominators (excluding unclear outcomes from numerator)"
              />
              <Divider />
              <TableContainer>
                <Table size="medium">
                  <TableHead sx={{ bgcolor: 'grey.50' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Store Location</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700 }}>Total Completed</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700 }}>Confirmed Sales</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700 }}>Conversion Rate</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700 }}>Follow-ups</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700 }}>Unconverted</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Top Demanded Products</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Top Objections</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {storeComparison.map((st) => (
                      <TableRow key={st.storeCode} hover>
                        <TableCell>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                            {st.storeName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Code: {st.storeCode}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>
                            {st.totalEligibleConversations}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Typography variant="body2" sx={{ fontWeight: 700, color: '#15803D' }}>
                            {st.confirmedSales}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={`${st.conversionRate}%`}
                            size="small"
                            sx={{
                              fontWeight: 700,
                              bgcolor: st.conversionRate >= 30 ? '#F0FDF4' : '#FFFBEB',
                              color: st.conversionRate >= 30 ? '#15803D' : '#B45309',
                            }}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Typography variant="body2" sx={{ fontWeight: 600, color: '#B45309' }}>
                            {st.followUpsRequired}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Typography variant="body2" sx={{ fontWeight: 600, color: '#B91C1C' }}>
                            {st.unconverted}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {st.topProducts && st.topProducts.length > 0 ? (
                            <Stack direction="row" spacing={0.5} flexWrap="wrap">
                              {st.topProducts.map((p, i) => (
                                <Chip key={i} label={`${p.product} (${p.count})`} size="small" variant="outlined" sx={{ fontSize: '0.6875rem' }} />
                              ))}
                            </Stack>
                          ) : (
                            <Typography variant="caption" color="text.secondary">None</Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          {st.topObjections && st.topObjections.length > 0 ? (
                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                              {st.topObjections.map((o) => `${o.objection} (${o.count})`).join(', ')}
                            </Typography>
                          ) : (
                            <Typography variant="caption" color="text.secondary">None recorded</Typography>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Card>
          )}

          {/* TAB 3: CUSTOMER NEEDS & FOLLOW-UPS */}
          {activeTab === 3 && (
            <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2.5 }}>
              <CardHeader
                title={<Typography variant="h6" sx={{ fontWeight: 700 }}>Aggregated Customer Requirements</Typography>}
                subheader="Explicit customer requirements and recommended actions (no personal profiles or sensitive inferences)"
              />
              <Divider />
              <TableContainer>
                <Table size="medium">
                  <TableHead sx={{ bgcolor: 'grey.50' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Stated Customer Requirement</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Store & Salesperson</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Outcome & Intent</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Budget / Price Mention</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Next Recommended Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {customerRequirements.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                          <Typography variant="body2" color="text.secondary">
                            No explicit requirements logged in the selected sessions.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      customerRequirements.map((req, idx) => (
                        <TableRow key={idx} hover>
                          <TableCell sx={{ maxWidth: 300 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                              {req.requirement}
                            </Typography>
                            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.5 }}>
                              Session: {req.sessionId}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {req.salesRep}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {req.storeCode} • {req.startedAt ? new Date(req.startedAt).toLocaleDateString() : ''}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={req.outcome}
                              size="small"
                              sx={{
                                fontWeight: 600,
                                fontSize: '0.6875rem',
                                bgcolor:
                                  req.outcome === 'Sale Confirmed'
                                    ? '#F0FDF4'
                                    : req.outcome === 'Follow-up Required'
                                    ? '#FFFBEB'
                                    : '#FEF2F2',
                                color:
                                  req.outcome === 'Sale Confirmed'
                                    ? '#15803D'
                                    : req.outcome === 'Follow-up Required'
                                    ? '#B45309'
                                    : '#B91C1C',
                              }}
                            />
                            <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', mt: 0.25 }}>
                              Intent: {req.buyingIntent}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {req.budgetAndPrice}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ maxWidth: 280 }}>
                            <Typography variant="caption" sx={{ color: 'text.primary', fontWeight: 500 }}>
                              {req.nextRecommendedAction}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Card>
          )}

          {/* TAB 4: DEMAND TRENDS */}
          {activeTab === 4 && (
            <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2.5 }}>
              <CardHeader
                title={<Typography variant="h6" sx={{ fontWeight: 700 }}>Daily Demand & Conversion Trends</Typography>}
                subheader="Chronological activity breakdown across the selected date range"
              />
              <Divider />
              <TableContainer>
                <Table size="medium">
                  <TableHead sx={{ bgcolor: 'grey.50' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700 }}>Total Dialogues</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700 }}>Confirmed Sales</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700 }}>Follow-ups</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700 }}>Unconverted</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700 }}>Conversion Rate</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {demandTrends.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                          <Typography variant="body2" color="text.secondary">
                            No chronological trend data found.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ) : (
                      demandTrends.map((t) => {
                        const dayRate = t.total > 0 ? ((t.sales / t.total) * 100).toFixed(1) : 0;
                        return (
                          <TableRow key={t.date} hover>
                            <TableCell sx={{ fontWeight: 600 }}>{t.date}</TableCell>
                            <TableCell align="center">{t.total}</TableCell>
                            <TableCell align="center" sx={{ color: '#15803D', fontWeight: 700 }}>
                              {t.sales}
                            </TableCell>
                            <TableCell align="center" sx={{ color: '#B45309' }}>{t.followUps}</TableCell>
                            <TableCell align="center" sx={{ color: '#B91C1C' }}>{t.unconverted}</TableCell>
                            <TableCell align="center">
                              <Chip
                                label={`${dayRate}%`}
                                size="small"
                                sx={{
                                  fontWeight: 700,
                                  bgcolor: dayRate >= 30 ? '#F0FDF4' : '#F3F4F6',
                                  color: dayRate >= 30 ? '#15803D' : '#4B5563',
                                }}
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Card>
          )}
        </>
      )}

      {/* DRILL-DOWN EVIDENCE DIALOG */}
      <Dialog
        open={drilldownModal.open}
        onClose={() => setDrilldownModal({ open: false, title: '', type: '', data: null })}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ m: 0, p: 2.5, fontWeight: 700, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>{drilldownModal.title}</Typography>
          <IconButton onClick={() => setDrilldownModal({ open: false, title: '', type: '', data: null })} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ p: 3 }}>
          {drilldownModal.data && drilldownModal.type === 'product' && (
            <Stack spacing={2.5}>
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                  Verifiable Transcript Excerpts
                </Typography>
                {drilldownModal.data.evidenceQuotes?.length > 0 ? (
                  <Stack spacing={1.5}>
                    {drilldownModal.data.evidenceQuotes.map((eq, i) => (
                      <Paper key={i} sx={{ p: 2, bgcolor: 'grey.50', border: '1px solid', borderColor: 'divider' }}>
                        <Typography variant="body2" sx={{ fontStyle: 'italic', mb: 0.75 }}>
                          "{eq.quote}"
                        </Typography>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Chip label={`Session: ${eq.sessionId}`} size="small" sx={{ fontSize: '0.6875rem' }} />
                          <Typography variant="caption" color="text.secondary">
                            Store: {eq.storeCode} • Sales Rep: {eq.salesRep}
                          </Typography>
                        </Stack>
                      </Paper>
                    ))}
                  </Stack>
                ) : (
                  <Typography variant="body2" color="text.secondary">No explicit quotes captured.</Typography>
                )}
              </Box>

              <Divider />
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                  Customer Questions for this Product
                </Typography>
                {drilldownModal.data.commonQuestions?.length > 0 ? (
                  <Stack spacing={1}>
                    {drilldownModal.data.commonQuestions.map((q, i) => (
                      <Typography key={i} variant="caption" sx={{ color: 'text.secondary' }}>
                        • {q}
                      </Typography>
                    ))}
                  </Stack>
                ) : (
                  <Typography variant="caption" color="text.secondary">No specific questions logged.</Typography>
                )}
              </Box>
            </Stack>
          )}

          {drilldownModal.data && drilldownModal.type === 'objection' && (
            <Stack spacing={2}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                Dialogue Excerpts Supporting This Objection Category
              </Typography>
              {drilldownModal.data.evidenceQuotes?.map((eq, i) => (
                <Paper key={i} sx={{ p: 2, bgcolor: '#FEF2F2', border: '1px solid', borderColor: '#FECACA' }}>
                  <Typography variant="body2" sx={{ fontStyle: 'italic', mb: 0.75, color: '#991B1B' }}>
                    "{eq.quote}"
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    Session: {eq.sessionId} • Store: {eq.storeCode} • Sales Rep: {eq.salesRep}
                  </Typography>
                </Paper>
              ))}
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDrilldownModal({ open: false, title: '', type: '', data: null })}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
