/**
 * TalentScan AI Utilities
 */

/**
 * Generates a unique ID (v4 UUID format)
 * @returns {string}
 */
export function generateId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'ts-' + Math.random().toString(36).substring(2, 15) + '-' + Math.random().toString(36).substring(2, 15);
}

/**
 * Sanitizes input text to prevent XSS attacks when rendering html
 * @param {string} str 
 * @returns {string}
 */
export function sanitizeHTML(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Formats a date string to a human-readable format
 * @param {string} isoString 
 * @returns {string}
 */
export function formatDate(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

/**
 * Formats a number to a percentage
 * @param {number} value (0-100 or 0-1)
 * @param {boolean} isDecimal (if true, multiplies by 100 first)
 * @returns {string}
 */
export function formatPercent(value, isDecimal = false) {
  const num = isDecimal ? value : value / 100;
  return new Intl.NumberFormat(undefined, {
    style: 'percent',
    maximumFractionDigits: 0
  }).format(num);
}

/**
 * Sanitizes and extracts text from an uploaded PDF file (ArrayBuffer) using PDF.js
 * @param {ArrayBuffer} arrayBuffer 
 * @returns {Promise<string>}
 */
export async function extractTextFromPDF(arrayBuffer) {
  if (!window.pdfjsLib) {
    throw new Error('PDF parser (PDF.js) is loading or failed to load. Please try again or copy-paste text.');
  }

  try {
    // Configure worker
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
    
    const loadingTask = window.pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    let fullText = '';

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      let lastY, text = '';
      for (const item of textContent.items) {
        if (lastY !== undefined && Math.abs(item.transform[5] - lastY) > 5) {
          text += '\n';
        }
        text += item.str + ' ';
        lastY = item.transform[5];
      }
      fullText += text + '\n\n';
    }

    return fullText.trim();
  } catch (error) {
    console.error('Error parsing PDF:', error);
    throw new Error('Failed to parse PDF file. Ensure it is not password protected and contains readable text.');
  }
}
