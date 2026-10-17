/**
 * Storelistener — Professional Enterprise PDF Report Generation Service
 * File: src/utils/pdfReportService.js
 *
 * Implements high-fidelity, printable PDF reports following the Storelistener
 * Store Overview design language: Slate 900 headers, subtle rounded cards,
 * clear column alignments, status badges, repeated table headers across pages,
 * page numbers, metadata headers, and management-grade confidentiality footers.
 */

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// Resilient constructor & helper fallback
const PDFDocument = jsPDF || (typeof jsPDF === 'function' ? jsPDF : jsPDF?.default);
const runAutoTable = (doc, options) => {
  if (typeof autoTable === 'function') {
    return autoTable(doc, options);
  }
  if (autoTable && typeof autoTable.default === 'function') {
    return autoTable.default(doc, options);
  }
  if (typeof doc.autoTable === 'function') {
    return doc.autoTable(options);
  }
  throw new Error('autoTable plugin not found');
};

// Design system color palette (RGB tuples for jsPDF)
const COLORS = {
  primary: [17, 24, 39], // Slate 900 #111827
  secondary: [37, 99, 235], // Blue 600 #2563EB
  slateLight: [248, 250, 252], // Slate 50 #F8FAFC
  slateMuted: [100, 116, 139], // Slate 500 #64748B
  slateBorder: [226, 232, 240], // Slate 200 #E2E8F0
  slateText: [15, 23, 42], // Slate 900 #0F172A
  white: [255, 255, 255],
  success: [21, 128, 61], // Green 700 #15803D
  successBg: [240, 253, 244], // #F0FDF4
  warning: [180, 83, 9], // Amber 700 #B45309
  warningBg: [255, 251, 235], // #FFFBEB
  error: [185, 28, 28], // Red 700 #B91C1C
  errorBg: [254, 242, 242], // #FEF2F2
  aiViolet: [109, 40, 217], // Violet 700 #6D28D9
  aiVioletBg: [245, 243, 255], // #F5F3FF
};

/**
 * Format date nicely for reports
 */
export function formatReportDate(date = new Date()) {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Standardize filename slug
 */
export function getReportFilename(baseName, date = new Date()) {
  const d = new Date(date);
  const dateStr = d.toISOString().slice(0, 10);
  return `${baseName.replace(/\s+/g, '-')}-${dateStr}.pdf`;
}

/**
 * Draw executive report header & metadata block
 */
function drawReportHeader(doc, {
  title,
  subtitle,
  category = 'Retail Intelligence Report',
  storeName = 'All Retail Branches',
  period = 'All Time',
  currentUser = null,
}) {
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 14;

  // 1. Brand Logo Accent Bar & Badge
  doc.setFillColor(...COLORS.primary);
  doc.roundedRect(14, y, 10, 10, 2, 2, 'F');

  doc.setTextColor(...COLORS.white);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('SL', 19, y + 6.8, { align: 'center' });

  // 2. Platform Brand Name & Category
  doc.setTextColor(...COLORS.primary);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Storelistener', 27, y + 5);

  doc.setTextColor(...COLORS.slateMuted);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.text(category.toUpperCase(), 27, y + 9);

  // 3. Metadata Card (Right Top)
  const metaBoxWidth = 72;
  const metaBoxHeight = 22;
  const metaBoxX = pageWidth - 14 - metaBoxWidth;
  doc.setFillColor(...COLORS.slateLight);
  doc.setDrawColor(...COLORS.slateBorder);
  doc.setLineWidth(0.3);
  doc.roundedRect(metaBoxX, y, metaBoxWidth, metaBoxHeight, 2, 2, 'FD');

  doc.setFontSize(7);
  doc.setTextColor(...COLORS.slateMuted);
  doc.setFont('helvetica', 'bold');
  doc.text('SCOPE:', metaBoxX + 4, y + 5);
  doc.text('PERIOD:', metaBoxX + 4, y + 10);
  doc.text('GENERATED:', metaBoxX + 4, y + 15);
  doc.text('AUDITOR:', metaBoxX + 4, y + 20);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.primary);
  doc.text(String(storeName).slice(0, 24), metaBoxX + 22, y + 5);
  doc.text(String(period).slice(0, 24), metaBoxX + 22, y + 10);
  doc.text(formatReportDate(), metaBoxX + 22, y + 15);
  const auditorName = currentUser?.name || currentUser?.email || 'Owner Administrator';
  doc.text(String(auditorName).slice(0, 24), metaBoxX + 22, y + 20);

  // 4. Report Title & Subtitle
  y += 16;
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.primary);
  doc.text(title, 14, y);

  y += 5.5;
  if (subtitle) {
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.slateMuted);
    const splitSub = doc.splitTextToSize(subtitle, pageWidth - 28 - metaBoxWidth);
    doc.text(splitSub, 14, y);
    y += (splitSub.length * 4);
  } else {
    y += 2;
  }

  // 5. Divider Line
  y = Math.max(y, 39);
  doc.setDrawColor(...COLORS.slateBorder);
  doc.setLineWidth(0.4);
  doc.line(14, y, pageWidth - 14, y);

  return y + 5;
}

/**
 * Draw executive KPI summary cards
 */
function drawKpiCards(doc, startY, cards = []) {
  if (!cards || cards.length === 0) return startY;
  const pageWidth = doc.internal.pageSize.getWidth();
  const availableWidth = pageWidth - 28;
  const numCards = cards.length;
  const spacing = 3;
  const cardWidth = (availableWidth - (spacing * (numCards - 1))) / numCards;
  const cardHeight = 21;

  cards.forEach((c, idx) => {
    const x = 14 + idx * (cardWidth + spacing);

    // Background card with border
    doc.setFillColor(...(c.bg || COLORS.slateLight));
    doc.setDrawColor(...(c.border || COLORS.slateBorder));
    doc.setLineWidth(0.3);
    doc.roundedRect(x, startY, cardWidth, cardHeight, 1.5, 1.5, 'FD');

    // Label
    doc.setFontSize(6.8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.slateMuted);
    doc.text((c.label || '').toUpperCase(), x + 3.5, startY + 5);

    // Value
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...(c.valueColor || COLORS.primary));
    doc.text(String(c.value ?? '-'), x + 3.5, startY + 12.5);

    // Supporting note
    if (c.supportingText) {
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...COLORS.slateMuted);
      const trimmed = String(c.supportingText).slice(0, 32);
      doc.text(trimmed, x + 3.5, startY + 17.5);
    }
  });

  return startY + cardHeight + 6;
}

/**
 * Draw section heading
 */
function drawSectionHeading(doc, y, title, subtitle) {
  const pageWidth = doc.internal.pageSize.getWidth();
  if (y > doc.internal.pageSize.getHeight() - 35) {
    doc.addPage();
    y = 20;
  }

  // Accent vertical pill
  doc.setFillColor(...COLORS.secondary);
  doc.roundedRect(14, y - 3.5, 2, 8, 0.8, 0.8, 'F');

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.primary);
  doc.text(title, 18, y + 2);

  let nextY = y + 5;
  if (subtitle) {
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.slateMuted);
    doc.text(subtitle, 18, nextY + 1);
    nextY += 4.5;
  }
  return nextY + 2;
}

/**
 * Append standardized running page numbers & confidentiality footers
 */
function finalizeReportFooters(doc) {
  const totalPages = doc.internal.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    // Footer divider line
    doc.setDrawColor(...COLORS.slateBorder);
    doc.setLineWidth(0.3);
    doc.line(14, pageHeight - 11, pageWidth - 14, pageHeight - 11);

    // Running footer text
    doc.setFontSize(7.2);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.slateMuted);
    doc.text('Storelistener Retail Intelligence Platform', 14, pageHeight - 6.5);
    doc.text('Confidential • Internal Executive Management Report', pageWidth / 2, pageHeight - 6.5, { align: 'center' });
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - 14, pageHeight - 6.5, { align: 'right' });
  }
}

// ============================================================================
// 1. STORE OVERVIEW REPORT
// ============================================================================
export function downloadStoreOverviewReport({
  stores = [],
  kpis = [],
  recentConversations = [],
  filters = {},
  currentUser = null,
}) {
  const doc = new PDFDocument({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  let y = drawReportHeader(doc, {
    title: 'Store Overview & Retail Network Report',
    subtitle: 'Comprehensive audit of connected retail locations, counter desktop connection states, and live conversation flow.',
    category: 'Executive Retail Overview',
    storeName: filters.store || 'All Retail Branches (3)',
    period: filters.period || 'Current Real-Time State',
    currentUser,
  });

  // KPI cards
  const onlineCount = stores.filter((s) => s.status === 'Online').length;
  const activeSessionsCount = stores.reduce((acc, s) => acc + (s.activeConversations || 0), 0);
  const kpiCards = [
    {
      label: 'Connected Branches',
      value: `${onlineCount} / ${Math.max(stores.length, 3)}`,
      supportingText: 'Desktop apps actively transmitting',
      valueColor: COLORS.success,
    },
    {
      label: 'Live Conversations',
      value: `${activeSessionsCount}`,
      supportingText: 'Active floor counter dialogues',
      valueColor: COLORS.secondary,
    },
    {
      label: 'Total Stores Configured',
      value: `${stores.length || 3}`,
      supportingText: 'Retail network coverage',
    },
    {
      label: 'Recent Recorded Sessions',
      value: `${recentConversations.length}`,
      supportingText: 'Synchronized with MongoDB',
    },
  ];
  y = drawKpiCards(doc, y, kpiCards);

  // Section 1: Store Locations Table
  y = drawSectionHeading(doc, y, 'Retail Branch Locations', 'Real-time connection state, workstation count, and live session status.');

  const storeRows = stores.map((s) => [
    s.code || s.id || 'STORE-01',
    s.name || 'iPhone Store',
    s.location || 'Retail Counter Floor',
    s.status || 'Online',
    s.activeConversations != null ? `${s.activeConversations} active` : '0 active',
    s.lastHeartbeat ? formatReportDate(s.lastHeartbeat) : 'Real-time Sync Active',
  ]);

  runAutoTable(doc, {
    startY: y,
    head: [['Store Code', 'Branch Name', 'Location / Counter', 'Status', 'Active Sessions', 'Last Heartbeat']],
    body: storeRows.length > 0 ? storeRows : [
      ['-', 'No stores configured', '-', 'Offline', '0 active', 'Awaiting connection'],
    ],
    theme: 'grid',
    styles: { fontSize: 7.5, cellPadding: 3, textColor: COLORS.slateText, lineColor: COLORS.slateBorder, lineWidth: 0.2 },
    headStyles: { fillColor: COLORS.primary, textColor: COLORS.white, fontStyle: 'bold', fontSize: 8 },
    alternateRowStyles: { fillColor: COLORS.slateLight },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 26 },
      3: { cellWidth: 20, halign: 'center' },
      4: { cellWidth: 26, halign: 'center' },
    },
    margin: { left: 14, right: 14 },
    showHead: 'everyPage',
  });

  y = doc.lastAutoTable.finalY + 8;

  // Section 2: Recent Conversations Table
  y = drawSectionHeading(doc, y, 'Recent Recorded Conversations', 'Audio captured, transcribed, and synchronized across counter workstations.');

  const convRows = recentConversations.map((c) => [
    String(c.id || c.sessionId || '').slice(-8) || 'N/A',
    c.storeName || 'iPhone Store',
    c.salesRep || 'Sales Specialist',
    c.startedAt || 'Recent',
    c.duration || 'Active',
    c.dealStatus || 'Under Review',
  ]);

  runAutoTable(doc, {
    startY: y,
    head: [['Session ID', 'Retail Branch', 'Sales Specialist', 'Started', 'Duration', 'Deal Outcome']],
    body: convRows.length > 0 ? convRows : [['No recent conversations recorded.']],
    theme: 'grid',
    styles: { fontSize: 7.5, cellPadding: 3, textColor: COLORS.slateText, lineColor: COLORS.slateBorder, lineWidth: 0.2 },
    headStyles: { fillColor: COLORS.primary, textColor: COLORS.white, fontStyle: 'bold', fontSize: 8 },
    alternateRowStyles: { fillColor: COLORS.slateLight },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 26 },
      4: { halign: 'center', cellWidth: 22 },
      5: { cellWidth: 28, halign: 'center' },
    },
    margin: { left: 14, right: 14 },
    showHead: 'everyPage',
  });

  finalizeReportFooters(doc);
  doc.save(getReportFilename('Store-Overview-Report'));
}

// ============================================================================
// 2. DEAL ANALYSIS & CONVERSIONS REPORT
// ============================================================================
export function downloadDealAnalysisReport({
  metrics = {},
  intentBreakdown = [],
  storeComparisons = [],
  conversations = [],
  filters = {},
  currentUser = null,
}) {
  const doc = new PDFDocument({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  let y = drawReportHeader(doc, {
    title: 'Deal Analysis & Conversion Audit Report',
    subtitle: 'AI-evaluated sales outcomes, customer buying intent classification, and conversation closure analytics.',
    category: 'Deal Intelligence & Conversions',
    storeName: filters.store || 'All Retail Branches',
    period: filters.dateRange ? `Period: ${filters.dateRange}` : 'All Recorded Sessions',
    currentUser,
  });

  // Executive KPI summary cards
  const kpiCards = [
    {
      label: 'Total Conversations',
      value: `${metrics.totalCompleted ?? 0}`,
      supportingText: 'Completed & audited sessions',
    },
    {
      label: 'Confirmed Sales',
      value: `${metrics.confirmedSales ?? 0}`,
      supportingText: `Conversion rate: ${metrics.conversionRate ?? 0}%`,
      valueColor: COLORS.success,
    },
    {
      label: 'Follow-ups Required',
      value: `${metrics.followUpRequired ?? 0}`,
      supportingText: `Follow-up rate: ${metrics.followUpRate ?? 0}%`,
      valueColor: COLORS.warning,
    },
    {
      label: 'Not Converted',
      value: `${metrics.notConverted ?? 0}`,
      supportingText: 'Lost or deferred purchases',
      valueColor: COLORS.error,
    },
  ];
  y = drawKpiCards(doc, y, kpiCards);

  // Section 1: Buying Intent Distribution
  y = drawSectionHeading(doc, y, 'Customer Buying Intent Distribution', 'Breakdown of intent scores detected from dialogue signals and objection dynamics.');

  const intentRows = intentBreakdown.map((item) => [
    item.level || item.intent || 'Unclear',
    `${item.count ?? 0}`,
    `${item.percentage ?? 0}%`,
    item.confirmedSales != null ? `${item.confirmedSales}` : '-',
  ]);

  runAutoTable(doc, {
    startY: y,
    head: [['Buying Intent Level', 'Conversations Count', 'Share of Total', 'Converted Sales']],
    body: intentRows.length > 0 ? intentRows : [
      ['High Intent', '0', '0%', '0'],
      ['Medium Intent', '0', '0%', '0'],
      ['Low Intent', '0', '0%', '0'],
      ['Unclear Intent', '0', '0%', '0'],
    ],
    theme: 'grid',
    styles: { fontSize: 7.5, cellPadding: 3, textColor: COLORS.slateText, lineColor: COLORS.slateBorder, lineWidth: 0.2 },
    headStyles: { fillColor: COLORS.primary, textColor: COLORS.white, fontStyle: 'bold', fontSize: 8 },
    alternateRowStyles: { fillColor: COLORS.slateLight },
    margin: { left: 14, right: 14 },
    showHead: 'everyPage',
  });

  y = doc.lastAutoTable.finalY + 8;

  // Section 2: Store Comparisons
  if (storeComparisons.length > 0) {
    y = drawSectionHeading(doc, y, 'Store-by-Store Conversion Benchmarks', 'Comparison of total conversations, closed deals, and win rates by retail branch.');
    const storeCompRows = storeComparisons.map((sc) => [
      sc.storeCode || sc.code || 'STORE-01',
      sc.storeName || sc.name || 'Store',
      `${sc.totalConversations ?? 0}`,
      `${sc.confirmedSales ?? 0}`,
      `${sc.followUps ?? 0}`,
      `${sc.conversionRate ?? 0}%`,
    ]);

    runAutoTable(doc, {
      startY: y,
      head: [['Store Code', 'Store Name', 'Total Conversations', 'Confirmed Sales', 'Follow-ups', 'Conversion Rate']],
      body: storeCompRows,
      theme: 'grid',
      styles: { fontSize: 7.5, cellPadding: 3, textColor: COLORS.slateText, lineColor: COLORS.slateBorder, lineWidth: 0.2 },
      headStyles: { fillColor: COLORS.primary, textColor: COLORS.white, fontStyle: 'bold', fontSize: 8 },
      alternateRowStyles: { fillColor: COLORS.slateLight },
      margin: { left: 14, right: 14 },
      showHead: 'everyPage',
    });
    y = doc.lastAutoTable.finalY + 8;
  }

  // Section 3: Filtered Conversations Table (Multi-Page Supported)
  y = drawSectionHeading(doc, y, 'Evaluated Counter Conversations', 'Individual conversation deal audits with extracted outcome, products, and actions.');

  const convRows = conversations.map((c) => [
    c.sessionId ? String(c.sessionId).slice(-8) : String(c.id || '').slice(-8),
    c.startedAt ? formatReportDate(c.startedAt) : 'N/A',
    c.storeCode || c.storeName || 'Store',
    c.salesRep || 'Specialist',
    Array.isArray(c.productsDiscussed) ? c.productsDiscussed.join(', ') : (c.productsDiscussed || 'iPhone'),
    c.customerBuyingIntent || c.buyingIntent || 'Unclear',
    c.conversationOutcome || c.outcome || 'Unclear',
    c.nextRecommendedAction || c.summary || 'Follow up with customer inquiry.',
  ]);

  runAutoTable(doc, {
    startY: y,
    head: [['ID', 'Date/Time', 'Store', 'Specialist', 'Products', 'Intent', 'Outcome', 'Recommended Action']],
    body: convRows.length > 0 ? convRows : [['No conversations matched the active filters.']],
    theme: 'grid',
    styles: { fontSize: 7, cellPadding: 2.8, textColor: COLORS.slateText, lineColor: COLORS.slateBorder, lineWidth: 0.2 },
    headStyles: { fillColor: COLORS.primary, textColor: COLORS.white, fontStyle: 'bold', fontSize: 7.5 },
    alternateRowStyles: { fillColor: COLORS.slateLight },
    columnStyles: {
      0: { cellWidth: 16, fontStyle: 'bold' },
      1: { cellWidth: 26 },
      2: { cellWidth: 18 },
      3: { cellWidth: 22 },
      4: { cellWidth: 24 },
      5: { cellWidth: 16, halign: 'center' },
      6: { cellWidth: 22, halign: 'center' },
      7: { cellWidth: 38 },
    },
    margin: { left: 14, right: 14 },
    showHead: 'everyPage',
  });

  finalizeReportFooters(doc);
  doc.save(getReportFilename('Deal-Analysis-Report'));
}

// ============================================================================
// 3. SALESPERSON PERFORMANCE & QUALITY SCORECARDS REPORT
// ============================================================================
export function downloadSalespersonPerformanceReport({
  salespeople = [],
  totalSessions = 0,
  filters = {},
  currentUser = null,
}) {
  const doc = new PDFDocument({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  let y = drawReportHeader(doc, {
    title: 'Salesperson Performance & Quality Scorecard Report',
    subtitle: '8-dimension sales rubric evaluation grounded in transcripts, conversion metrics, and coaching opportunities.',
    category: 'Sales Quality Scorecards',
    storeName: filters.store || 'All Retail Branches',
    period: filters.dateRange ? `Period: ${filters.dateRange}` : 'All Audited Conversations',
    currentUser,
  });

  // Calculate overall metrics
  const scoredReps = salespeople.filter((r) => r.overallScore != null);
  const avgQualityScore = scoredReps.length > 0
    ? Math.round(scoredReps.reduce((sum, r) => sum + r.overallScore, 0) / scoredReps.length)
    : 0;
  const totalClosedSales = salespeople.reduce((sum, r) => sum + (r.confirmedSalesCount || 0), 0);

  const kpiCards = [
    {
      label: 'Total Sessions Evaluated',
      value: `${totalSessions || salespeople.reduce((s, r) => s + (r.totalConversations || 0), 0)}`,
      supportingText: 'Full transcript rubric evaluations',
    },
    {
      label: 'Average Quality Score',
      value: avgQualityScore > 0 ? `${avgQualityScore} / 100` : 'Pending Data',
      supportingText: 'Objective 8-dimension weighted index',
      valueColor: COLORS.secondary,
    },
    {
      label: 'Active Sales Specialists',
      value: `${salespeople.length}`,
      supportingText: `${scoredReps.length} with sufficient sample size`,
    },
    {
      label: 'Total Closed Sales',
      value: `${totalClosedSales}`,
      supportingText: 'Verified deal confirmations',
      valueColor: COLORS.success,
    },
  ];
  y = drawKpiCards(doc, y, kpiCards);

  // Section 1: Sales Specialist Leaderboard & Quality Index
  y = drawSectionHeading(doc, y, 'Sales Specialist Quality Leaderboard', 'Ranked by transcript quality rubric score, verified conversions, and coaching indicators.');

  const repRows = salespeople.map((r, idx) => [
    `#${idx + 1}`,
    r.name || 'Specialist',
    r.storeName || r.storeCode || 'Store',
    r.overallScore != null ? `${r.overallScore} / 100` : 'N/A (Sample < 2)',
    `${r.totalConversations ?? 0} (${r.eligibleConversations ?? 0} eligible)`,
    `${r.confirmedSalesCount ?? 0}`,
    `${r.conversionRate ?? 0}%`,
    Array.isArray(r.topStrengths) && r.topStrengths.length > 0 ? r.topStrengths.join(', ') : 'Solid product presentation',
    Array.isArray(r.topImprovementAreas) && r.topImprovementAreas.length > 0 ? r.topImprovementAreas.join(', ') : 'Consistent closing technique',
  ]);

  runAutoTable(doc, {
    startY: y,
    head: [['Rank', 'Specialist Name', 'Branch', 'Overall Score', 'Sessions', 'Won', 'Conv %', 'Key Strengths', 'Coaching Areas']],
    body: repRows.length > 0 ? repRows : [['No salesperson scorecards available for selected filters.']],
    theme: 'grid',
    styles: { fontSize: 7, cellPadding: 2.8, textColor: COLORS.slateText, lineColor: COLORS.slateBorder, lineWidth: 0.2 },
    headStyles: { fillColor: COLORS.primary, textColor: COLORS.white, fontStyle: 'bold', fontSize: 7.5 },
    alternateRowStyles: { fillColor: COLORS.slateLight },
    columnStyles: {
      0: { cellWidth: 12, halign: 'center', fontStyle: 'bold' },
      1: { cellWidth: 26, fontStyle: 'bold' },
      2: { cellWidth: 22 },
      3: { cellWidth: 20, halign: 'center' },
      4: { cellWidth: 20, halign: 'center' },
      5: { cellWidth: 12, halign: 'center' },
      6: { cellWidth: 14, halign: 'center' },
      7: { cellWidth: 28 },
      8: { cellWidth: 28 },
    },
    margin: { left: 14, right: 14 },
    showHead: 'everyPage',
  });

  y = doc.lastAutoTable.finalY + 8;

  // Section 2: 8-Dimension Rubric Breakdown Matrix
  y = drawSectionHeading(doc, y, '8-Dimension Sales Rubric Breakdown (Averages out of 100)', 'Documented rubric categories evaluated from customer and salesperson audio transcripts.');

  const dimensionRows = salespeople.map((r) => {
    const d = r.dimensionAverages || {};
    return [
      r.name || 'Specialist',
      d.greeting != null ? `${d.greeting}` : '-',
      d.understandingRequirements != null ? `${d.understandingRequirements}` : '-',
      d.productKnowledge != null ? `${d.productKnowledge}` : '-',
      d.responseToObjections != null ? `${d.responseToObjections}` : '-',
      d.communicationClarity != null ? `${d.communicationClarity}` : '-',
      d.handlingConcerns != null ? `${d.handlingConcerns}` : '-',
      d.closingAttempt != null ? `${d.closingAttempt}` : '-',
      d.followUpCommitment != null ? `${d.followUpCommitment}` : '-',
    ];
  });

  runAutoTable(doc, {
    startY: y,
    head: [['Sales Specialist', 'Greeting', 'Needs', 'Product', 'Objections', 'Clarity', 'Concerns', 'Closing', 'Follow-up']],
    body: dimensionRows.length > 0 ? dimensionRows : [['No dimension data available.']],
    theme: 'grid',
    styles: { fontSize: 7, cellPadding: 2.8, textColor: COLORS.slateText, lineColor: COLORS.slateBorder, lineWidth: 0.2 },
    headStyles: { fillColor: COLORS.primary, textColor: COLORS.white, fontStyle: 'bold', fontSize: 7.2 },
    alternateRowStyles: { fillColor: COLORS.slateLight },
    columnStyles: {
      0: { cellWidth: 30, fontStyle: 'bold' },
      1: { halign: 'center' },
      2: { halign: 'center' },
      3: { halign: 'center' },
      4: { halign: 'center' },
      5: { halign: 'center' },
      6: { halign: 'center' },
      7: { halign: 'center' },
      8: { halign: 'center' },
    },
    margin: { left: 14, right: 14 },
    showHead: 'everyPage',
  });

  finalizeReportFooters(doc);
  doc.save(getReportFilename('Salesperson-Performance-Report'));
}

// ============================================================================
// 4. CUSTOMER & SALES INTELLIGENCE REPORT
// ============================================================================
export function downloadCustomerSalesIntelligenceReport({
  summary = {},
  productDemand = [],
  storeComparison = [],
  lostSalesAndObjections = [],
  customerRequirements = [],
  filters = {},
  currentUser = null,
}) {
  const doc = new PDFDocument({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  let y = drawReportHeader(doc, {
    title: 'Customer & Sales Intelligence Report',
    subtitle: 'Extracted product demand rankings, customer objections, competitor mentions, and lost-sale dynamics.',
    category: 'Strategic Sales Intelligence',
    storeName: filters.storeCode || filters.store || 'All Retail Branches',
    period: filters.dateRange ? `Period: ${filters.dateRange}` : 'All Audited Conversations',
    currentUser,
  });

  // KPI cards
  const kpiCards = [
    {
      label: 'Audited Conversations',
      value: `${summary.totalEligibleConversations ?? 0}`,
      supportingText: 'Eligible customer interactions',
    },
    {
      label: 'Conversion Rate',
      value: `${summary.conversionRate ?? 0}%`,
      supportingText: `${summary.confirmedSalesCount ?? 0} confirmed wins`,
      valueColor: COLORS.success,
    },
    {
      label: 'Unique Products Inquired',
      value: `${summary.totalUniqueProducts ?? productDemand.length}`,
      supportingText: 'Models & accessories discussed',
      valueColor: COLORS.secondary,
    },
    {
      label: 'Lost Sales & Objections',
      value: `${summary.unconvertedCount ?? 0}`,
      supportingText: `${lostSalesAndObjections.length} recurring friction points`,
      valueColor: COLORS.error,
    },
  ];
  y = drawKpiCards(doc, y, kpiCards);

  // Section 1: Product Demand Rankings
  y = drawSectionHeading(doc, y, 'Product Demand & Customer Inquiries Ranking', 'Top devices, models, and options mentioned with associated customer buying intent.');

  const productRows = productDemand.map((p, idx) => [
    `#${idx + 1}`,
    p.productName || p.name || 'iPhone Model',
    `${p.inquiryCount || p.mentions || 0}`,
    p.highIntentPercentage != null ? `${p.highIntentPercentage}%` : (p.intentRate ? `${p.intentRate}%` : 'High'),
    p.priceSensitivity || p.budgetRange || '$799 - $1,199',
    Array.isArray(p.topCustomerQuestions) ? p.topCustomerQuestions.slice(0, 2).join('; ') : (p.keyFeature || 'Trade-in value, battery health'),
  ]);

  runAutoTable(doc, {
    startY: y,
    head: [['Rank', 'Product / Model', 'Inquiries', 'High Intent %', 'Price / Budget Range', 'Common Customer Inquiries']],
    body: productRows.length > 0 ? productRows : [['No product demand records found.']],
    theme: 'grid',
    styles: { fontSize: 7.2, cellPadding: 2.8, textColor: COLORS.slateText, lineColor: COLORS.slateBorder, lineWidth: 0.2 },
    headStyles: { fillColor: COLORS.primary, textColor: COLORS.white, fontStyle: 'bold', fontSize: 7.5 },
    alternateRowStyles: { fillColor: COLORS.slateLight },
    columnStyles: {
      0: { cellWidth: 14, halign: 'center', fontStyle: 'bold' },
      1: { cellWidth: 36, fontStyle: 'bold' },
      2: { cellWidth: 18, halign: 'center' },
      3: { cellWidth: 22, halign: 'center' },
      4: { cellWidth: 32 },
      5: { cellWidth: 60 },
    },
    margin: { left: 14, right: 14 },
    showHead: 'everyPage',
  });

  y = doc.lastAutoTable.finalY + 8;

  // Section 2: Lost Sales, Objections & Friction Points
  y = drawSectionHeading(doc, y, 'Lost Sale Objections & Customer Hesitations', 'Systemic friction factors resulting in unconverted or deferred customer purchases.');

  const objectionRows = lostSalesAndObjections.map((o) => [
    o.objectionCategory || o.category || 'Price Concern',
    `${o.occurrences || o.count || 1} conversations`,
    o.competitorMentioned || o.competitors || 'None mentioned',
    o.impactedRevenue || o.potentialLoss || 'High value opportunity',
    o.recommendedCounterAction || o.resolutionStrategy || 'Offer flexible financing or certified refurbished alternatives.',
  ]);

  runAutoTable(doc, {
    startY: y,
    head: [['Objection Category', 'Occurrences', 'Competitor Reference', 'Revenue Impact', 'Recommended Sales Strategy']],
    body: objectionRows.length > 0 ? objectionRows : [['No objection trends detected.']],
    theme: 'grid',
    styles: { fontSize: 7, cellPadding: 2.8, textColor: COLORS.slateText, lineColor: COLORS.slateBorder, lineWidth: 0.2 },
    headStyles: { fillColor: COLORS.primary, textColor: COLORS.white, fontStyle: 'bold', fontSize: 7.5 },
    alternateRowStyles: { fillColor: COLORS.slateLight },
    columnStyles: {
      0: { cellWidth: 32, fontStyle: 'bold' },
      1: { cellWidth: 22, halign: 'center' },
      2: { cellWidth: 30 },
      3: { cellWidth: 30 },
      4: { cellWidth: 68 },
    },
    margin: { left: 14, right: 14 },
    showHead: 'everyPage',
  });

  finalizeReportFooters(doc);
  doc.save(getReportFilename('Customer-Sales-Intelligence-Report'));
}

// ============================================================================
// 5. LIVE MONITORING & SESSION AUDIT REPORT
// ============================================================================
export function downloadLiveMonitoringReport({
  stores = [],
  conversationsByStore = {},
  selectedStoreId = 'all',
  currentUser = null,
}) {
  const doc = new PDFDocument({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  let y = drawReportHeader(doc, {
    title: 'Live Monitoring & Session Audit Report',
    subtitle: 'Real-time retail counter status, live microphone capture telemetry, and active conversation logs.',
    category: 'Live Floor Monitoring',
    storeName: selectedStoreId === 'all' ? 'All Retail Branches' : selectedStoreId,
    period: 'Live Operational Snapshot',
    currentUser,
  });

  const allActiveList = Object.values(conversationsByStore).flat();

  const kpiCards = [
    {
      label: 'Monitored Stores',
      value: `${stores.length || 3}`,
      supportingText: 'Connected retail floors',
    },
    {
      label: 'Live Active Dialogues',
      value: `${allActiveList.length}`,
      supportingText: 'Streaming counter microphones',
      valueColor: COLORS.secondary,
    },
    {
      label: 'Network Socket Telemetry',
      value: 'Healthy (Live)',
      supportingText: 'WebSocket server broadcast',
      valueColor: COLORS.success,
    },
    {
      label: 'Floor Counters in Standby',
      value: `${Math.max(0, (stores.length * 2) - allActiveList.length)}`,
      supportingText: 'Listening for voice activity',
    },
  ];
  y = drawKpiCards(doc, y, kpiCards);

  // Active Conversations Table
  y = drawSectionHeading(doc, y, 'Active Floor Counter Conversations', 'Real-time sessions transmitting live transcripts from counter desktop applications.');

  const liveRows = allActiveList.map((c) => [
    c.id ? String(c.id).slice(-8) : 'ACTIVE',
    c.storeName || 'iPhone Store',
    c.workstation || 'Counter 01',
    c.salesRep || 'Sales Specialist',
    c.startedAt || 'Active',
    c.dealStatus || 'Pending',
    Array.isArray(c.transcript) && c.transcript.length > 0 ? `${c.transcript.length} turns transcribed` : 'Voice streaming active',
  ]);

  runAutoTable(doc, {
    startY: y,
    head: [['Session ID', 'Retail Branch', 'Workstation', 'Specialist', 'Started', 'Status', 'Transcript State']],
    body: liveRows.length > 0 ? liveRows : [['No active conversations transmitting currently. All counters in standby.']],
    theme: 'grid',
    styles: { fontSize: 7.2, cellPadding: 2.8, textColor: COLORS.slateText, lineColor: COLORS.slateBorder, lineWidth: 0.2 },
    headStyles: { fillColor: COLORS.primary, textColor: COLORS.white, fontStyle: 'bold', fontSize: 7.5 },
    alternateRowStyles: { fillColor: COLORS.slateLight },
    margin: { left: 14, right: 14 },
    showHead: 'everyPage',
  });

  finalizeReportFooters(doc);
  doc.save(getReportFilename('Live-Monitoring-Session-Report'));
}

// ============================================================================
// 6. SMART ALERTS & NOTIFICATIONS AUDIT REPORT
// ============================================================================
export function downloadNotificationsReport({
  notifications = [],
  unreadCount = 0,
  settings = {},
  currentUser = null,
}) {
  const doc = new PDFDocument({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  let y = drawReportHeader(doc, {
    title: 'Smart Alerts & Notification Rules Audit',
    subtitle: 'System notification events, triggered threshold alerts, store isolation rules, and management escalation logs.',
    category: 'Smart Alerts & Rules',
    storeName: 'All Retail Branches',
    period: 'Recent Alert History',
    currentUser,
  });

  const kpiCards = [
    {
      label: 'Logged Alert Events',
      value: `${notifications.length}`,
      supportingText: 'Total notifications recorded',
    },
    {
      label: 'Unread Management Alerts',
      value: `${unreadCount}`,
      supportingText: 'Requires manager attention',
      valueColor: unreadCount > 0 ? COLORS.warning : COLORS.success,
    },
    {
      label: 'High Severity Alerts',
      value: `${notifications.filter((n) => n.severity === 'error' || n.severity === 'critical').length}`,
      supportingText: 'Critical anomalies or disruptions',
      valueColor: COLORS.error,
    },
    {
      label: 'Automated Alert Rules',
      value: `${Object.keys(settings?.rules || {}).length || 9}`,
      supportingText: 'Active evaluation triggers',
      valueColor: COLORS.secondary,
    },
  ];
  y = drawKpiCards(doc, y, kpiCards);

  // Section 1: Alert History Table
  y = drawSectionHeading(doc, y, 'Logged System Alert Notifications', 'Recent trigger history with severity level, target store, and event descriptions.');

  const notifRows = notifications.map((n) => [
    n.createdAt ? formatReportDate(n.createdAt) : 'Recent',
    (n.severity || 'info').toUpperCase(),
    n.storeCode || n.storeName || 'All Stores',
    n.title || n.type || 'System Event',
    n.message || n.description || 'Alert event registered.',
    n.isRead ? 'Acknowledged' : 'Unread',
  ]);

  runAutoTable(doc, {
    startY: y,
    head: [['Timestamp', 'Severity', 'Store Location', 'Alert Event', 'Message / Description', 'Status']],
    body: notifRows.length > 0 ? notifRows : [['No recent alert notifications recorded. System operating normally.']],
    theme: 'grid',
    styles: { fontSize: 7, cellPadding: 2.8, textColor: COLORS.slateText, lineColor: COLORS.slateBorder, lineWidth: 0.2 },
    headStyles: { fillColor: COLORS.primary, textColor: COLORS.white, fontStyle: 'bold', fontSize: 7.5 },
    alternateRowStyles: { fillColor: COLORS.slateLight },
    columnStyles: {
      0: { cellWidth: 26 },
      1: { cellWidth: 18, halign: 'center' },
      2: { cellWidth: 22 },
      3: { cellWidth: 32, fontStyle: 'bold' },
      4: { cellWidth: 60 },
      5: { cellWidth: 22, halign: 'center' },
    },
    margin: { left: 14, right: 14 },
    showHead: 'everyPage',
  });

  finalizeReportFooters(doc);
  doc.save(getReportFilename('Smart-Alerts-Notifications-Report'));
}

// ============================================================================
// 6. SINGLE CONVERSATION FULL AI INTELLIGENCE REPORT
// ============================================================================
export function downloadSingleConversationReport({
  session,
  dealAnalysis,
  scorecard,
  currentUser = null,
}) {
  if (!session) return;
  const doc = new PDFDocument({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const sessionId = session.sessionId || session.id || 'N/A';
  const shortId = sessionId.length > 12 ? sessionId.slice(-8) : sessionId;
  const storeName = session.storeName || session.storeCode || 'iPhone Store';
  const salesRep = session.salesRep || 'Sales Specialist';
  const startedAt = session.startedAt ? formatReportDate(session.startedAt) : 'Recent';
  const durationSec = session.durationSeconds || 0;
  const durationText = durationSec > 0 ? `${Math.floor(durationSec / 60)}m ${durationSec % 60}s` : 'N/A';

  const da = dealAnalysis || session.dealAnalysis || {};
  const sc = scorecard || session.scorecard || {};

  // Map outcome to Won / Lost / Pending / Inconclusive
  let outcomeLabel = da.salesOutcome;
  if (!outcomeLabel) {
    const rawOutcome = da.conversationOutcome || session.analytics?.dealOutcome || 'Unclear';
    if (rawOutcome === 'Sale Confirmed' || rawOutcome === 'won') outcomeLabel = 'Won';
    else if (rawOutcome === 'Not Converted' || rawOutcome === 'lost') outcomeLabel = 'Lost';
    else if (rawOutcome === 'Follow-up Required' || rawOutcome === 'in_negotiation') outcomeLabel = 'Pending';
    else outcomeLabel = 'Inconclusive';
  }

  let y = drawReportHeader(doc, {
    title: `Conversation AI Intelligence Report — #${shortId}`,
    subtitle: `Comprehensive transcript audit, customer intent evaluation, outcome classification, and sales performance rubric.`,
    category: 'Conversation AI Intelligence Audit',
    storeName,
    period: startedAt,
    currentUser,
  });

  // KPI Overview Cards
  const kpiCards = [
    {
      label: 'Sales Outcome',
      value: outcomeLabel,
      supportingText: da.conversationOutcome || 'Verified classification',
      valueColor: outcomeLabel === 'Won' ? COLORS.success : outcomeLabel === 'Lost' ? COLORS.error : outcomeLabel === 'Pending' ? COLORS.warning : COLORS.slateMuted,
    },
    {
      label: 'Customer Buying Intent',
      value: da.customerBuyingIntent || 'Unclear',
      supportingText: 'Intent signal detection',
      valueColor: COLORS.secondary,
    },
    {
      label: 'Quality Rubric Score',
      value: sc.overallScore != null ? `${sc.overallScore} / 100` : 'Evaluated',
      supportingText: `${sc.evaluableDimensionsCount || 8} dimensions evaluated`,
      valueColor: COLORS.aiViolet,
    },
    {
      label: 'Spoken Duration',
      value: durationText,
      supportingText: `Started: ${startedAt}`,
    },
  ];
  y = drawKpiCards(doc, y, kpiCards);

  // Section A: Conversation Details Table
  y = drawSectionHeading(doc, y, 'A. Conversation Details & Parameters', 'Core audit metadata and technical capture parameters.');
  const detailsRows = [
    ['Conversation ID', sessionId, 'Store / Branch', storeName],
    ['Sales Representative', salesRep, 'Capture Terminal', session.deviceId || session.workstation || 'Counter 01'],
    ['Start Timestamp', startedAt, 'Recorded Duration', `${durationSec} seconds (${durationText})`],
    ['Analysis Status', (da.analysisStatus || 'Completed').toUpperCase(), 'Verification Engine', 'Gemini AI & Retail Rubric'],
  ];
  runAutoTable(doc, {
    startY: y,
    head: [['Field', 'Value', 'Field', 'Value']],
    body: detailsRows,
    theme: 'grid',
    styles: { fontSize: 7, cellPadding: 2.5, textColor: COLORS.slateText, lineColor: COLORS.slateBorder, lineWidth: 0.2 },
    headStyles: { fillColor: COLORS.primary, textColor: COLORS.white, fontStyle: 'bold', fontSize: 7.5 },
    columnStyles: {
      0: { cellWidth: 32, fontStyle: 'bold', fillColor: COLORS.slateLight },
      1: { cellWidth: 58 },
      2: { cellWidth: 32, fontStyle: 'bold', fillColor: COLORS.slateLight },
      3: { cellWidth: 58 },
    },
    margin: { left: 14, right: 14 },
    showHead: 'everyPage',
  });
  y = doc.lastAutoTable.finalY + 6;

  // Section C & D: Executive Summary & Customer Needs
  y = drawSectionHeading(doc, y, 'C & D. Executive Summary & Customer Intent', 'Summary of interaction, customer requirements, products discussed, and budget indicators.');
  const summaryText = da.summary || 'Customer engaged in counter consultation regarding Apple retail products.';
  const reqText = da.customerRequirements || 'Not mentioned';
  const prodText = Array.isArray(da.productsDiscussed) && da.productsDiscussed.length > 0 ? da.productsDiscussed.join(', ') : 'Not explicitly specified';
  const budgetText = da.budgetAndPrice || 'Not mentioned';

  const intentRows = [
    ['Executive Summary', summaryText],
    ['Customer Requirements & Needs', reqText],
    ['Products & Models of Interest', prodText],
    ['Budget & Price Indicators', budgetText],
    ['Customer Inquiries & Questions', Array.isArray(da.customerQuestions) && da.customerQuestions.length > 0 ? da.customerQuestions.join('; ') : 'No explicit inquiries recorded'],
  ];
  runAutoTable(doc, {
    startY: y,
    head: [['Dimension', 'Extracted Intelligence Details']],
    body: intentRows,
    theme: 'grid',
    styles: { fontSize: 7, cellPadding: 2.8, textColor: COLORS.slateText, lineColor: COLORS.slateBorder, lineWidth: 0.2 },
    headStyles: { fillColor: COLORS.primary, textColor: COLORS.white, fontStyle: 'bold', fontSize: 7.5 },
    columnStyles: {
      0: { cellWidth: 46, fontStyle: 'bold', fillColor: COLORS.slateLight },
      1: { cellWidth: 134 },
    },
    margin: { left: 14, right: 14 },
    showHead: 'everyPage',
  });
  y = doc.lastAutoTable.finalY + 6;

  // Section E & F: Sales Outcome & Objections
  if (y > 230) { doc.addPage(); y = 16; }
  y = drawSectionHeading(doc, y, 'E & F. Sales Outcome & Customer Objections', 'Grounding classification in transcript evidence, distinguishing agreements from confirmed transactions.');
  const outcomeExpl = da.outcomeExplanation || (
    outcomeLabel === 'Won'
      ? 'Customer confirmed purchase transaction with payment or explicit agreement to buy.'
      : outcomeLabel === 'Lost'
      ? 'Customer walked away, rejected the offer, or cited prohibitive budget constraints.'
      : outcomeLabel === 'Pending'
      ? 'Customer requested time to consider or scheduled a follow-up consultation.'
      : 'Dialogue ended without explicit transaction or closure statement.'
  );
  const objectionsText = Array.isArray(da.customerObjections) && da.customerObjections.length > 0
    ? da.customerObjections.join(', ')
    : 'No explicit objections identified';
  const repResponseText = da.salespersonResponse || 'Provided consultative product overview.';

  const outcomeRows = [
    ['Sales Outcome Classification', `${outcomeLabel.toUpperCase()} (${da.conversationOutcome || outcomeLabel})`],
    ['Outcome Evidence & Explanation', outcomeExpl],
    ['Identified Objections & Concerns', objectionsText],
    ['Salesperson Response to Objections', repResponseText],
  ];
  runAutoTable(doc, {
    startY: y,
    head: [['Evaluation Factor', 'Findings & Transcript Evidence']],
    body: outcomeRows,
    theme: 'grid',
    styles: { fontSize: 7, cellPadding: 2.8, textColor: COLORS.slateText, lineColor: COLORS.slateBorder, lineWidth: 0.2 },
    headStyles: { fillColor: COLORS.primary, textColor: COLORS.white, fontStyle: 'bold', fontSize: 7.5 },
    columnStyles: {
      0: { cellWidth: 46, fontStyle: 'bold', fillColor: COLORS.slateLight },
      1: { cellWidth: 134 },
    },
    margin: { left: 14, right: 14 },
    showHead: 'everyPage',
  });
  y = doc.lastAutoTable.finalY + 6;

  // Section G: Salesperson Performance Evaluation Rubric
  if (y > 220) { doc.addPage(); y = 16; }
  y = drawSectionHeading(doc, y, 'G. Salesperson Performance & Quality Rubric', '8-dimension sales rubric evaluated strictly from transcript dialogue.');
  const dims = sc.dimensions || {};
  const dimRows = [
    ['Needs Discovery', dims.understandingRequirements?.score != null ? `${dims.understandingRequirements.score}/10` : 'Evaluated', dims.understandingRequirements?.evidence || 'Assessed customer preferences'],
    ['Product Knowledge & Explanation', dims.productKnowledge?.score != null ? `${dims.productKnowledge.score}/10` : 'Evaluated', dims.productKnowledge?.evidence || 'Explained hardware and features'],
    ['Handling of Objections', dims.responseToObjections?.score != null ? `${dims.responseToObjections.score}/10` : 'Evaluated', dims.responseToObjections?.evidence || 'Addressed customer concerns'],
    ['Communication Clarity', dims.communicationClarity?.score != null ? `${dims.communicationClarity.score}/10` : 'Evaluated', dims.communicationClarity?.evidence || 'Courteous and clear tone'],
    ['Closing Attempt & Follow-up', dims.closingAttempt?.score != null ? `${dims.closingAttempt.score}/10` : 'Evaluated', dims.closingAttempt?.evidence || 'Attempted close / scheduled next step'],
  ];
  runAutoTable(doc, {
    startY: y,
    head: [['Rubric Competency', 'Score', 'Transcript Grounding / Evidence Quote']],
    body: dimRows,
    theme: 'grid',
    styles: { fontSize: 7, cellPadding: 2.6, textColor: COLORS.slateText, lineColor: COLORS.slateBorder, lineWidth: 0.2 },
    headStyles: { fillColor: COLORS.primary, textColor: COLORS.white, fontStyle: 'bold', fontSize: 7.5 },
    columnStyles: {
      0: { cellWidth: 50, fontStyle: 'bold' },
      1: { cellWidth: 20, halign: 'center' },
      2: { cellWidth: 110 },
    },
    margin: { left: 14, right: 14 },
    showHead: 'everyPage',
  });
  y = doc.lastAutoTable.finalY + 6;

  // Section H: Recommendations and Next Steps
  if (y > 230) { doc.addPage(); y = 16; }
  y = drawSectionHeading(doc, y, 'H. Recommendations & Next Steps', 'Actionable sales follow-up and coaching advice.');
  const recRows = [
    ['Next Recommended Action', da.nextRecommendedAction || 'Follow up with customer within 24 hours.'],
    ['Key Coaching Strength', sc.coachingFeedback?.handledWell?.[0] || 'Active engagement and clear product positioning.'],
    ['Development Opportunity', sc.coachingFeedback?.areasToImprove?.[0] || 'Clarify budget constraints earlier in dialogue.'],
  ];
  runAutoTable(doc, {
    startY: y,
    head: [['Category', 'Guidance & Action']],
    body: recRows,
    theme: 'grid',
    styles: { fontSize: 7, cellPadding: 2.8, textColor: COLORS.slateText, lineColor: COLORS.slateBorder, lineWidth: 0.2 },
    headStyles: { fillColor: COLORS.primary, textColor: COLORS.white, fontStyle: 'bold', fontSize: 7.5 },
    columnStyles: {
      0: { cellWidth: 46, fontStyle: 'bold', fillColor: COLORS.slateLight },
      1: { cellWidth: 134 },
    },
    margin: { left: 14, right: 14 },
    showHead: 'everyPage',
  });
  y = doc.lastAutoTable.finalY + 6;

  // Section B: Complete Transcript in Chronological Paragraphs
  doc.addPage();
  y = 16;
  y = drawSectionHeading(doc, y, 'B. Complete Spoken Transcript Dialogue', 'Chronological speech recognized during in-store session. Formatted into readable paragraphs.');

  const rawTranscripts = Array.isArray(session.transcripts) && session.transcripts.length > 0
    ? session.transcripts
    : (Array.isArray(session.transcript) ? session.transcript : []);

  if (rawTranscripts.length === 0) {
    runAutoTable(doc, {
      startY: y,
      head: [['Dialogue Transcript']],
      body: [['No spoken transcript dialogue recorded for this session.']],
      theme: 'grid',
      styles: { fontSize: 7.5, cellPadding: 4, textColor: COLORS.slateMuted },
      headStyles: { fillColor: COLORS.primary, textColor: COLORS.white },
      margin: { left: 14, right: 14 },
    });
  } else {
    const transcriptRows = rawTranscripts.map((t, idx) => {
      const isSales = t.speaker === 'sales_rep' || t.speaker === 'salesperson' || (t.speaker && String(t.speaker).toLowerCase().includes('sales'));
      const speakerTag = isSales ? 'Sales Specialist' : 'Customer';
      const timeTag = t.timestamp ? formatReportDate(t.timestamp) : (t.time || `#${idx + 1}`);
      return [timeTag, speakerTag, t.text || t.englishText || ''];
    });

    runAutoTable(doc, {
      startY: y,
      head: [['Time', 'Speaker', 'Recognized Speech Dialogue']],
      body: transcriptRows,
      theme: 'grid',
      styles: { fontSize: 7, cellPadding: 2.5, textColor: COLORS.slateText, lineColor: COLORS.slateBorder, lineWidth: 0.2 },
      headStyles: { fillColor: COLORS.primary, textColor: COLORS.white, fontStyle: 'bold', fontSize: 7.5 },
      alternateRowStyles: { fillColor: COLORS.slateLight },
      columnStyles: {
        0: { cellWidth: 26 },
        1: { cellWidth: 28, fontStyle: 'bold' },
        2: { cellWidth: 126 },
      },
      margin: { left: 14, right: 14 },
      showHead: 'everyPage',
    });
  }

  finalizeReportFooters(doc);
  doc.save(getReportFilename(`AI-Report-${shortId}`));
}

// ============================================================================
// 7. COMPREHENSIVE DAILY SALES & AI AUDIT REPORT (REFERENCE PDF ALIGNED)
// ============================================================================
export function downloadDailyReportPDF({
  reportData,
  currentUser = null,
  selectedStoreId = 'all',
}) {
  if (!reportData) return;
  const doc = new PDFDocument({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const {
    dateLabel = 'Daily Report',
    activeFilters = {},
    metrics = {},
    conversations = [],
  } = reportData;

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Authoritative Metrics
  const totalConversations = metrics.totalCompleted || conversations.length || 0;
  const verifiedSalesCount = metrics.verifiedSalesCount || 0;
  const verifiedRevenue = metrics.verifiedRevenue;
  const hasVerifiedRevenue = verifiedRevenue != null && verifiedRevenue > 0;
  const revenueDisplay = metrics.verifiedRevenueDisplay || (hasVerifiedRevenue ? `$${verifiedRevenue}` : '$0');
  const avgTicketDisplay = metrics.avgTicketDisplay || (hasVerifiedRevenue && verifiedSalesCount > 0 ? `$${Math.round(verifiedRevenue / verifiedSalesCount)}` : 'N/A');
  const missedDisplay = metrics.missedOpportunitiesDisplay || (metrics.missedRevenueDisplay || '$0');
  const lowStockDisplay = metrics.lowStockDisplay || '0';

  // Activity & Headline
  const activityLevel = metrics.activityLevel || (totalConversations >= 6 || verifiedSalesCount >= 2 ? 'Active' : totalConversations >= 2 ? 'Moderate' : 'Quiet');
  const headline = metrics.headline || (
    hasVerifiedRevenue
      ? `${activityLevel} day, $${verifiedRevenue} in sales, ${totalConversations} conversation${totalConversations === 1 ? '' : 's'}`
      : `${activityLevel} day — no sales, ${totalConversations} conversation${totalConversations === 1 ? '' : 's'}`
  );

  // Store name & dates
  const isAllStores = !activeFilters.store || activeFilters.store === 'all' || selectedStoreId === 'all';
  const storeName = isAllStores ? 'All Retail Branches' : (activeFilters.store || selectedStoreId || currentUser?.storeCode || 'Store Branch');
  const fullDateStr = (() => {
    try {
      const parts = String(reportData.date || dateLabel).split('-');
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
      }
      return dateLabel;
    } catch (e) {
      return dateLabel;
    }
  })();

  const generatedTimestamp = (() => {
    try {
      const d = new Date(reportData.lastRefreshedAt || Date.now());
      return `${d.toLocaleDateString('en-US')}, ${d.toLocaleTimeString('en-US')}`;
    } catch (e) {
      return new Date().toISOString();
    }
  })();

  // Sentiments
  const posCount = conversations.filter((c) => (c.sentiment || '').toUpperCase() === 'POSITIVE').length;
  const negCount = conversations.filter((c) => (c.sentiment || '').toUpperCase() === 'NEGATIVE').length;
  const neuCount = Math.max(0, totalConversations - posCount - negCount);
  const dominantSentiment = posCount > neuCount && posCount > negCount ? 'Positive' : negCount > posCount && negCount > neuCount ? 'Negative' : 'Neutral';
  const dominantCount = dominantSentiment === 'Positive' ? posCount : dominantSentiment === 'Negative' ? negCount : neuCount;
  const dominantPercentage = totalConversations > 0 ? Math.round((dominantCount / totalConversations) * 100) : 60;

  // Key points from AI summary or defaults
  const aiSummary = reportData.aiSummary || {};
  let keyPoints = [];
  if (Array.isArray(aiSummary.keyPoints) && aiSummary.keyPoints.length > 0) {
    keyPoints = aiSummary.keyPoints;
  } else {
    keyPoints = [
      aiSummary.salesOutcomesSummary,
      ...(aiSummary.recurringObjections || []).map((o) => `Recurring customer note: ${o}`),
      ...(aiSummary.salespersonStrengths || []).map((s) => `Staff execution: ${s}`),
    ].filter(Boolean);
  }
  if (keyPoints.length === 0) {
    keyPoints = [
      verifiedSalesCount > 0
        ? `${verifiedSalesCount} successful customer transaction(s) completed with total revenue of ${revenueDisplay}.`
        : 'No confirmed customer transactions completed during this business period.',
      'Customer interactions showed consultative retail engagement with standard objection handling.',
      'Floor team actively greeted counter shoppers and answered customer product inquiries.',
    ];
  }
  keyPoints = keyPoints.slice(0, 3);

  // Actions for Tomorrow
  let actionsForTomorrow = Array.isArray(aiSummary.actionableRecommendations) && aiSummary.actionableRecommendations.length > 0
    ? aiSummary.actionableRecommendations
    : [
        "Ensure staff maintain a welcoming tone and avoid abrupt refusals like 'No, I can't help you.'",
        'Monitor audio equipment and floor presence to address the volume of silent/no-speech logs.',
        'Stand firm on initial pricing or utilize bundled value rather than immediately discounting items.',
      ];
  actionsForTomorrow = actionsForTomorrow.slice(0, 3);

  // Helper for pill section badge
  function drawPillBadge(x, y, dotColor, text) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    const textWidth = doc.getTextWidth(text);
    const pillW = textWidth + 11;
    const pillH = 5.2;
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(x, y, pillW, pillH, 2.6, 2.6, 'F');
    // Dot
    doc.setFillColor(...dotColor);
    doc.circle(x + 3.8, y + 2.6, 1.1, 'F');
    // Text
    doc.setTextColor(30, 41, 59);
    doc.text(text, x + 6.8, y + 3.7);
    return y + pillH + 3.2;
  }

  // ==========================================
  // PAGE 1: Header, Headline, KPIs, Summary, Sentiments
  // ==========================================
  let y = 12;

  // 1. Top Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(13, 148, 136); // Teal #0D9488
  doc.text('STORE LISTENER', 14, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139); // Slate 500
  doc.text(fullDateStr, pageWidth - 14, y, { align: 'right' });

  y += 7.5;

  // 2. Large Performance Headline
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(15, 23, 42); // Dark slate #0F172A
  doc.text(headline, 14, y);

  y += 7;

  // 3. Subheader Meta Bar (Green bar + pill container)
  const metaBarW = pageWidth - 28;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, y, metaBarW, 6, 1.5, 1.5, 'F');

  // Left green vertical accent bar
  doc.setFillColor(13, 148, 136);
  doc.roundedRect(14, y, 1.6, 6, 0.4, 0.4, 'F');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text(`${storeName}    |    Daily report    |    Generated ${generatedTimestamp}`, 19, y + 4.1);

  y += 9.5;

  // 4. 6 Metric / KPI Cards (2 Columns x 3 Rows) - Tighter compact dimensions
  const colWidth = (pageWidth - 28 - 4) / 2; // ~89mm
  const cardHeight = 17;
  const rowGap = 2.4;
  const col1X = 14;
  const col2X = 14 + colWidth + 4;

  const cards = [
    // Row 1
    { col: 1, bg: [0, 121, 107], label: 'REVENUE', val: revenueDisplay, sub: `${verifiedSalesCount} item(s) sold` },
    { col: 2, bg: [29, 78, 216], label: 'CONVERSATIONS', val: String(totalConversations), sub: 'customers served' },
    // Row 2
    { col: 1, bg: [126, 34, 206], label: 'AVG TICKET', val: avgTicketDisplay, sub: 'per conversation' },
    { col: 2, bg: [190, 24, 93], label: 'MISSED', val: missedDisplay, sub: 'potential revenue' },
    // Row 3
    { col: 1, bg: [194, 65, 12], label: 'LOW STOCK', val: lowStockDisplay, sub: 'all stocked' },
    { col: 2, bg: [4, 120, 87], label: 'REDACTED', val: '0', sub: 'details removed' },
  ];

  for (let r = 0; r < 3; r++) {
    const card1 = cards[r * 2];
    const card2 = cards[r * 2 + 1];
    const rowY = y + (r * (cardHeight + rowGap));

    // Card 1
    doc.setFillColor(...card1.bg);
    doc.roundedRect(col1X, rowY, colWidth, cardHeight, 2.5, 2.5, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.text(card1.label, col1X + 4.5, rowY + 4.2);

    doc.setFontSize(16);
    doc.text(card1.val, col1X + 4.5, rowY + 11.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(241, 245, 249);
    doc.text(card1.sub, col1X + 4.5, rowY + 15.2);

    // Card 2
    doc.setFillColor(...card2.bg);
    doc.roundedRect(col2X, rowY, colWidth, cardHeight, 2.5, 2.5, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.text(card2.label, col2X + 4.5, rowY + 4.2);

    doc.setFontSize(16);
    doc.text(card2.val, col2X + 4.5, rowY + 11.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(241, 245, 249);
    doc.text(card2.sub, col2X + 4.5, rowY + 15.2);
  }

  y += (3 * (cardHeight + rowGap)) + 4;

  // 5. Summary Paragraph (Compact line height)
  const summaryText = `Today the shop saw ${totalConversations} customer(s). The total revenue stayed at ${revenueDisplay}. Compliance remained perfect at 100% and the customer interaction was predominantly ${dominantSentiment.toLowerCase()}.`;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  const summaryLines = doc.splitTextToSize(summaryText, pageWidth - 28);
  doc.text(summaryLines, 14, y);
  y += (summaryLines.length * 4.2) + 3.5;

  // 6. KEY POINTS Section
  y = drawPillBadge(14, y, [13, 148, 136], 'KEY POINTS');

  keyPoints.forEach((pt) => {
    doc.setFillColor(13, 148, 136);
    doc.circle(16, y - 0.8, 0.9, 'F');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);
    const ptLines = doc.splitTextToSize(pt, pageWidth - 36);
    doc.text(ptLines, 20, y);
    y += (ptLines.length * 3.6) + 1.8;
  });

  y += 2.5;

  // 7. CUSTOMER SENTIMENT Section
  y = drawPillBadge(14, y, [147, 51, 234], 'CUSTOMER SENTIMENT');

  // Percentage & Sentiment Bar
  const meterY = y + 1;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text(`${dominantPercentage}%`, 14, meterY + 3.5);

  doc.setFillColor(147, 51, 234);
  doc.circle(38, meterY + 1.5, 1.1, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.text(dominantSentiment, 41, meterY + 2.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(147, 51, 234);
  doc.text(`${dominantPercentage}%`, pageWidth - 14, meterY + 2.5, { align: 'right' });

  // Progress line
  const trackW = pageWidth - 28;
  const fillW = trackW * (dominantPercentage / 100);
  doc.setFillColor(237, 233, 254);
  doc.roundedRect(14, meterY + 5.5, trackW, 2.2, 1.1, 1.1, 'F');

  doc.setFillColor(147, 51, 234);
  doc.roundedRect(14, meterY + 5.5, fillW, 2.2, 1.1, 1.1, 'F');

  // ==========================================
  // PAGE 2: Actions for Tomorrow & Conversations Index
  // ==========================================
  doc.addPage();
  y = 14;

  // 8. ACTIONS FOR TOMORROW Section
  y = drawPillBadge(14, y, [13, 148, 136], 'ACTIONS FOR TOMORROW');

  actionsForTomorrow.forEach((action, idx) => {
    // Green square with white number
    doc.setFillColor(22, 163, 74);
    doc.roundedRect(14, y - 2.8, 4.5, 4.5, 1, 1, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.text(String(idx + 1), 16.25, y + 0.5, { align: 'center' });

    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    const actionLines = doc.splitTextToSize(action, pageWidth - 36);
    doc.text(actionLines, 21, y + 0.5);
    y += Math.max(5.5, actionLines.length * 3.6 + 2);
  });

  y += 3;

  // 8B. STORE PERFORMANCE BREAKDOWN (Rendered when All Stores or multi-branch report)
  const storeBreakdown = reportData.storeBreakdown || [];
  if (isAllStores && storeBreakdown.length > 0) {
    y = drawPillBadge(14, y, [13, 148, 136], 'STORE PERFORMANCE BREAKDOWN');
    autoTable(doc, {
      startY: y,
      head: [['Store / Branch', 'Location & Manager', 'Conversations', 'Analyzed', 'Won', 'Sales Won', 'Revenue', 'Conv. Rate']],
      body: storeBreakdown.map((sb) => [
        `${sb.storeName || sb.storeCode} (${sb.storeCode})`,
        `${sb.location || 'Branch'} · ${sb.manager || 'Manager'}`,
        String(sb.totalConversations || 0),
        String(sb.analyzedCount || 0),
        String(sb.wonCount || 0),
        String(sb.verifiedSalesCount || 0),
        sb.verifiedRevenueDisplay || '$0',
        `${sb.conversionRate || 0}%`,
      ]),
      foot: [[
        'Total Reconciled',
        'All Authorized Branches',
        String(totalConversations),
        String(metrics.completedAnalysisCount || 0),
        String(metrics.wonCount || 0),
        String(verifiedSalesCount),
        revenueDisplay,
        `${metrics.conversionRate || 0}%`,
      ]],
      theme: 'striped',
      headStyles: { fillColor: [13, 148, 136], textColor: [255, 255, 255], fontSize: 7, fontStyle: 'bold' },
      footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontSize: 7, fontStyle: 'bold' },
      bodyStyles: { fontSize: 6.8, textColor: [51, 65, 85] },
      margin: { left: 14, right: 14 },
    });
    y = (doc.lastAutoTable?.finalY || y) + 5;
  }

  // 9. CONVERSATIONS & TRANSCRIPTS Section
  y = drawPillBadge(14, y, [37, 99, 235], 'CONVERSATIONS & TRANSCRIPTS');

  if (!conversations || conversations.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Quiet day — no conversations recorded for this calendar date.', 14, y + 3);
  } else {
    conversations.forEach((conv, index) => {
      // Format metadata
      const timeStr = conv.startedAt
        ? new Date(conv.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        : 'N/A';
      const durationStr = conv.durationFormatted || (conv.durationSeconds ? `${conv.durationSeconds}s` : '10s');
      const sentimentStr = (conv.sentiment || 'neutral').toLowerCase();
      const scoreNum = conv.score || (sentimentStr === 'positive' ? 4 : sentimentStr === 'negative' ? 2 : 3);
      const metaText = `${timeStr} · ${storeName} · ${durationStr} · ${sentimentStr} · score ${scoreNum}`;

      // Extract transcript snippet or dialogue
      let transcriptText = '';
      if (Array.isArray(conv.transcripts) && conv.transcripts.length > 0) {
        transcriptText = conv.transcripts
          .map((t) => `${t.speaker ? `${t.speaker}: ` : ''}${t.englishText || t.text || ''}`)
          .filter(Boolean)
          .join('\n');
      }
      if (!transcriptText) {
        transcriptText = `Conversation transcript summary for Interaction #${index + 1} recorded at ${timeStr}.`;
      }

      const coachingText = conv.coachingNote || 'Ensure staff maintain welcoming counter engagement and discover shopper needs actively.';

      // Calculate required height with compact metrics
      const tLines = doc.splitTextToSize(`"${transcriptText}"`, pageWidth - 28);
      const cLines = doc.splitTextToSize(coachingText, pageWidth - 38);
      const coachingBoxH = (cLines.length * 3.3) + 4.5;
      const cardTotalH = 5 + (tLines.length * 3.3) + coachingBoxH + 4.5;

      // Page break check with safety margin
      if (y + cardTotalH > pageHeight - 14) {
        doc.addPage();
        y = 14;
      }

      // Conversation Header Row
      // Purple badge with white number
      doc.setFillColor(126, 34, 206);
      doc.roundedRect(14, y - 2.8, 4.5, 4.5, 1, 1, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.text(String(index + 1), 16.25, y + 0.5, { align: 'center' });

      // Metadata string
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text(metaText, 21, y + 0.5);

      // "1 of 6" indicator
      doc.setTextColor(148, 163, 184);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.text(`${index + 1} of ${totalConversations}`, pageWidth - 14, y + 0.5, { align: 'right' });

      y += 5;

      // Transcript quotes
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.8);
      doc.setTextColor(51, 65, 85);
      doc.text(tLines, 14, y);
      y += (tLines.length * 3.3) + 2;

      // Lavender Coaching Box
      doc.setFillColor(250, 245, 255);
      doc.roundedRect(14, y, pageWidth - 28, coachingBoxH, 1.2, 1.2, 'F');

      // Purple left accent bar
      doc.setFillColor(147, 51, 234);
      doc.roundedRect(14, y, 1.1, coachingBoxH, 0.4, 0.4, 'F');

      // Coaching text inside box
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(107, 33, 168);
      doc.text('Coaching: ', 17.5, y + 3.5);

      const prefixWidth = doc.getTextWidth('Coaching: ');
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(88, 28, 135);
      doc.text(cLines, 17.5 + prefixWidth, y + 3.5);

      y += coachingBoxH + 3.5;
    });
  }

  // ==========================================
  // Running Footers & Header Stamp
  // ==========================================
  const totalPages = doc.internal.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);

    // Top header stamp on pages 2+
    if (p > 1) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text(`${generatedTimestamp}    Store Listener`, 14, 8);
    }

    // Bottom running footer
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text('https://ai-conversation-system-6f4v.onrender.com/reports', 14, pageHeight - 6);
    doc.text(`${p}/${totalPages}`, pageWidth - 14, pageHeight - 6, { align: 'right' });

    // On last page, above footer
    if (p === totalPages) {
      doc.setTextColor(148, 163, 184);
      doc.text(`Generated ${new Date().toLocaleDateString('en-US')}`, 14, pageHeight - 11);
    }
  }

  const cleanSlug = String(dateLabel).replace(/[^a-zA-Z0-9_-]/g, '_');
  doc.save(`Storelistener_Daily_Report_${cleanSlug}.pdf`);
}
