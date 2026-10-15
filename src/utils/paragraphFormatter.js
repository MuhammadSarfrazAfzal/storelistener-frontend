/**
 * Storelistener — Paragraph Formatting & Transcript Deduplication Utility
 * File: src/utils/paragraphFormatter.js
 *
 * Implements:
 * 1. Natural paragraph formatting: Combines speech chunks into readable paragraphs
 *    instead of disjointed 1-line boxes or one massive run-on line.
 * 2. Natural pause / sentence boundary detection: Breaks paragraphs on speaker changes,
 *    substantive pauses (>= 2s) with terminal punctuation, or multi-sentence completion.
 * 3. Overlap deduplication: Prevents repeated words or phrases across streaming chunks.
 * 4. Active sentence readability: Integrates in-flight interim transcription smoothly
 *    at the tail of the current paragraph with distinct styling.
 */

/**
 * Normalizes speaker label to standard display format
 */
export function normalizeSpeaker(speaker) {
  if (!speaker) return 'Customer';
  const clean = String(speaker).trim().toLowerCase();
  if (clean.includes('sales') || clean.includes('rep') || clean.includes('agent') || clean.includes('employee')) {
    return 'Sales Specialist';
  }
  if (clean.includes('cust') || clean.includes('client') || clean.includes('user')) {
    return 'Customer';
  }
  if (clean.startsWith('speaker')) {
    const num = clean.replace(/\D/g, '');
    return num ? `Speaker ${num}` : 'Speaker';
  }
  return speaker;
}

/**
 * Removes overlapping words/phrases between the end of existing text
 * and the beginning of newly arrived incoming text.
 */
export function deduplicateOverlap(existingText, incomingText) {
  if (!existingText || !existingText.trim()) return (incomingText || '').trim();
  if (!incomingText || !incomingText.trim()) return existingText.trim();

  const existing = existingText.trim();
  const incoming = incomingText.trim();

  if (existing.endsWith(incoming)) {
    return existing;
  }

  const existingWords = existing.split(/\s+/);
  const incomingWords = incoming.split(/\s+/);

  const maxOverlap = Math.min(8, existingWords.length, incomingWords.length);
  for (let len = maxOverlap; len >= 1; len--) {
    const existingSuffix = existingWords
      .slice(-len)
      .map((w) => w.toLowerCase().replace(/[^\w]/g, ''))
      .join(' ');
    const incomingPrefix = incomingWords
      .slice(0, len)
      .map((w) => w.toLowerCase().replace(/[^\w]/g, ''))
      .join(' ');

    if (existingSuffix && incomingPrefix && existingSuffix === incomingPrefix) {
      const remainder = incomingWords.slice(len).join(' ');
      if (!remainder) return existing;
      return `${existing} ${remainder}`;
    }
  }

  return `${existing} ${incoming}`;
}

function countSentences(text) {
  if (!text) return 0;
  const matches = text.match(/[.!?]+(?:\s+|$)/g);
  return matches ? matches.length : 0;
}

/**
 * Formats an array of finalized transcript segments and optional interim text
 * into cohesive, naturally readable paragraphs.
 */
export function formatIntoParagraphs(segments = [], interimText = '', activeSpeaker = 'Customer') {
  const paragraphs = [];
  let currentPara = null;

  const validSegments = Array.isArray(segments)
    ? segments.filter((s) => s && (s.englishText || s.text) && String(s.englishText || s.text).trim().length > 0)
    : [];

  for (let i = 0; i < validSegments.length; i++) {
    const seg = validSegments[i];
    const segText = String(seg.englishText || seg.text).trim();
    const speaker = normalizeSpeaker(seg.speaker);
    const segStart = typeof seg.startTime === 'number' ? seg.startTime : null;
    const segEnd = typeof seg.endTime === 'number' ? seg.endTime : null;

    if (!currentPara) {
      currentPara = {
        id: seg.segmentId || seg.id || `para-${i}`,
        speaker,
        text: segText,
        startTime: segStart,
        endTime: segEnd,
        timestamp: seg.timestamp || seg.time || new Date().toISOString(),
        isTranslated: Boolean(seg.isTranslated),
        sourceLanguage: seg.sourceLanguage || 'en',
        segmentsCount: 1,
      };
      continue;
    }

    const speakerChanged = currentPara.speaker !== speaker;
    const prevText = currentPara.text;
    const prevEndsWithPunct = /[.!?]$/.test(prevText);
    const sentenceCount = countSentences(prevText);
    const wordCount = prevText.split(/\s+/).length;

    let timeGap = 0;
    if (segStart !== null && currentPara.endTime !== null) {
      timeGap = segStart - currentPara.endTime;
    }

    const shouldBreak =
      speakerChanged ||
      (prevEndsWithPunct && timeGap >= 2.0) ||
      (prevEndsWithPunct && sentenceCount >= 3) ||
      (prevEndsWithPunct && wordCount >= 45);

    if (shouldBreak) {
      paragraphs.push(currentPara);
      currentPara = {
        id: seg.segmentId || seg.id || `para-${i}`,
        speaker,
        text: segText,
        startTime: segStart,
        endTime: segEnd,
        timestamp: seg.timestamp || seg.time || new Date().toISOString(),
        isTranslated: Boolean(seg.isTranslated),
        sourceLanguage: seg.sourceLanguage || 'en',
        segmentsCount: 1,
      };
    } else {
      currentPara.text = deduplicateOverlap(currentPara.text, segText);
      if (segEnd !== null) currentPara.endTime = segEnd;
      if (seg.isTranslated) currentPara.isTranslated = true;
      currentPara.segmentsCount = (currentPara.segmentsCount || 1) + 1;
    }
  }

  if (currentPara) {
    paragraphs.push(currentPara);
  }

  const cleanInterim = (interimText || '').trim();
  if (cleanInterim) {
    const normalizedActiveSpeaker = normalizeSpeaker(activeSpeaker);

    if (paragraphs.length > 0 && paragraphs[paragraphs.length - 1].speaker === normalizedActiveSpeaker) {
      const lastIndex = paragraphs.length - 1;
      paragraphs[lastIndex] = {
        ...paragraphs[lastIndex],
        interimSuffix: cleanInterim,
      };
    } else {
      paragraphs.push({
        id: 'draft-interim',
        speaker: normalizedActiveSpeaker,
        text: '',
        interimSuffix: cleanInterim,
        startTime: null,
        endTime: null,
        timestamp: new Date().toISOString(),
        isDraft: true,
      });
    }
  }

  return paragraphs;
}

export default formatIntoParagraphs;
