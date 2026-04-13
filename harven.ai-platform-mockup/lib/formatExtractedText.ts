/**
 * Formats raw extracted text into styled HTML with headings, lists, quotes, etc.
 */
export function formatExtractedText(rawText: string): string {
  if (!rawText) return '';

  // If already well-formatted HTML, return as-is
  if (rawText.includes('<h1>') || rawText.includes('<h2>') || rawText.includes('<div class="formatted')) {
    return rawText;
  }

  let cleanText = rawText
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\t/g, '  ')
    .replace(/\u00A0/g, ' ');

  const lines = cleanText.split('\n');
  let formattedHtml = '';
  let inList = false;
  let listType: 'ul' | 'ol' = 'ul';
  let currentParagraph = '';
  let headingIndex = 0;

  const flushParagraph = () => {
    if (currentParagraph.trim()) {
      let processed = currentParagraph.trim()
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/__(.+?)__/g, '<strong>$1</strong>')
        .replace(/_(.+?)_/g, '<em>$1</em>');
      formattedHtml += `<p class="mb-4 text-gray-700 leading-relaxed text-base">${processed}</p>`;
      currentParagraph = '';
    }
  };

  const closeList = () => {
    if (inList) {
      formattedHtml += listType === 'ol' ? '</ol>' : '</ul>';
      inList = false;
    }
  };

  const detectTitle = (line: string, nextLine: string): { isTitle: boolean; level: number } => {
    const trimmed = line.trim();

    if (/^#{1,6}\s+/.test(trimmed)) {
      const level = (trimmed.match(/^#+/) || [''])[0].length;
      return { isTitle: true, level: Math.min(level, 4) };
    }

    const isAllCaps = trimmed === trimmed.toUpperCase() && trimmed.length > 3 && /[A-Z]/.test(trimmed);
    const isShort = trimmed.length < 80 && !trimmed.endsWith('.') && !trimmed.endsWith(',');
    if (isAllCaps && isShort && trimmed.length > 3) {
      return { isTitle: true, level: 2 };
    }

    if (/^(\d+\.?\s+[A-Z]|Capítulo\s+\d+|CAPÍTULO\s+\d+|Módulo\s+\d+|MÓDULO\s+\d+|Seção\s+\d+|SEÇÃO\s+\d+|Parte\s+\d+|PARTE\s+\d+)/i.test(trimmed)) {
      const dots = (trimmed.match(/\./g) || []).length;
      return { isTitle: true, level: dots <= 1 ? 3 : 4 };
    }

    if (isShort && trimmed.length < 60 && trimmed.length > 3) {
      if (!nextLine || nextLine.length > trimmed.length * 2) {
        if (/^[A-Z]/.test(trimmed) && !/[.!?;,]$/.test(trimmed)) {
          return { isTitle: true, level: 3 };
        }
      }
    }

    return { isTitle: false, level: 0 };
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    const nextLine = lines[i + 1]?.trim() || '';

    if (!trimmedLine) {
      closeList();
      flushParagraph();
      continue;
    }

    const cleanTitle = trimmedLine.replace(/^#+\s+/, '');

    const titleInfo = detectTitle(trimmedLine, nextLine);
    if (titleInfo.isTitle) {
      closeList();
      flushParagraph();
      const headingId = `heading-${headingIndex++}`;

      let titleText = cleanTitle;
      if (cleanTitle === cleanTitle.toUpperCase() && cleanTitle.length > 3) {
        titleText = cleanTitle.charAt(0) + cleanTitle.slice(1).toLowerCase();
      }

      switch (titleInfo.level) {
        case 1:
          formattedHtml += `<h1 id="${headingId}" class="toc-heading text-3xl font-display font-bold text-harven-dark mt-12 mb-6 pb-3 border-b-2 border-primary scroll-mt-24">${titleText}</h1>`;
          break;
        case 2:
          formattedHtml += `<h2 id="${headingId}" class="toc-heading text-2xl font-display font-bold text-harven-dark mt-10 mb-4 pb-2 border-b border-harven-border scroll-mt-24">${titleText}</h2>`;
          break;
        case 3:
          formattedHtml += `<h3 id="${headingId}" class="toc-heading text-xl font-bold text-harven-dark mt-8 mb-3 scroll-mt-24">${titleText}</h3>`;
          break;
        default:
          formattedHtml += `<h4 id="${headingId}" class="toc-heading text-lg font-semibold text-harven-dark mt-6 mb-2 pl-4 border-l-2 border-primary scroll-mt-24">${titleText}</h4>`;
      }
      continue;
    }

    const unorderedListMatch = trimmedLine.match(/^[-*•]\s+(.+)/);
    if (unorderedListMatch) {
      flushParagraph();
      if (!inList || listType !== 'ul') {
        closeList();
        formattedHtml += '<ul class="list-none space-y-2 my-4 pl-2">';
        inList = true;
        listType = 'ul';
      }
      formattedHtml += `<li class="flex items-start gap-3"><span class="text-primary mt-1 flex-shrink-0">●</span><span class="text-gray-700">${unorderedListMatch[1]}</span></li>`;
      continue;
    }

    const orderedListMatch = trimmedLine.match(/^(\d+|[a-zA-Z])[.)]\s+(.+)/);
    if (orderedListMatch) {
      flushParagraph();
      if (!inList || listType !== 'ol') {
        closeList();
        formattedHtml += '<ol class="list-none space-y-2 my-4 pl-2 counter-reset-item">';
        inList = true;
        listType = 'ol';
      }
      formattedHtml += `<li class="flex items-start gap-3"><span class="text-primary font-bold mt-0 flex-shrink-0 min-w-[20px]">${orderedListMatch[1]}.</span><span class="text-gray-700">${orderedListMatch[2]}</span></li>`;
      continue;
    }

    if (/^[>"]/.test(trimmedLine) || /^»/.test(trimmedLine)) {
      closeList();
      flushParagraph();
      const quoteText = trimmedLine.replace(/^[>"»]\s*/, '').replace(/[""]$/, '');
      formattedHtml += `<blockquote class="border-l-4 border-harven-gold bg-harven-gold/5 pl-4 py-3 my-6 italic text-gray-600 rounded-r-lg">${quoteText}</blockquote>`;
      continue;
    }

    if (/^[-*_]{3,}$/.test(trimmedLine)) {
      closeList();
      flushParagraph();
      formattedHtml += '<hr class="my-8 border-t border-harven-border" />';
      continue;
    }

    closeList();
    if (currentParagraph) {
      currentParagraph += ' ' + trimmedLine;
    } else {
      currentParagraph = trimmedLine;
    }

    if (/[.!?]$/.test(trimmedLine) && nextLine && /^[A-Z]/.test(nextLine)) {
      flushParagraph();
    }
  }

  closeList();
  flushParagraph();

  if (!formattedHtml.trim() || formattedHtml.length < 50) {
    const paragraphs = rawText.split(/\n\n+/).filter(p => p.trim());
    return `<div class="space-y-4">${paragraphs.map(p =>
      `<p class="text-gray-700 leading-relaxed text-base">${p.trim().replace(/\n/g, ' ')}</p>`
    ).join('')}</div>`;
  }

  return `<div class="formatted-content space-y-1">${formattedHtml}</div>`;
}

/**
 * Extracts headings from text for Table of Contents generation.
 */
export function extractHeadings(text: string): Array<{ id: string; text: string; level: number }> {
  if (!text) return [];

  const headings: Array<{ id: string; text: string; level: number }> = [];
  const lines = text.split('\n');
  let headingIndex = 0;

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;

    const isAllCaps = trimmedLine === trimmedLine.toUpperCase() && trimmedLine.length > 3 && /[A-Z]/.test(trimmedLine);
    const isShortTitle = trimmedLine.length < 60 && !trimmedLine.endsWith('.') && !trimmedLine.endsWith(',');
    const isNumberedTitle = /^(\d+\.?\d*\.?\s+|Capítulo\s+\d+|CAPÍTULO\s+\d+|Seção\s+\d+|SEÇÃO\s+\d+)/i.test(trimmedLine);

    if ((isAllCaps && isShortTitle) || isNumberedTitle) {
      const id = `heading-${headingIndex++}`;
      const dots = (trimmedLine.match(/\./g) || []).length;
      const level = isAllCaps ? 1 : dots <= 1 ? 2 : 3;

      headings.push({
        id,
        text: isAllCaps ? trimmedLine.charAt(0) + trimmedLine.slice(1).toLowerCase() : trimmedLine,
        level
      });
    }
  }

  return headings;
}
