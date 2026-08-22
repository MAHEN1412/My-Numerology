/**
 * PDF TEXT EXTRACTION
 * ===================
 * Extracts text from a PDF buffer, page by page, so every stored chunk can
 * cite an accurate page number.
 *
 * Uses pdfjs-dist directly (patched version — the abandoned `pdf-parse`
 * package depends on an old, vulnerable pdfjs-dist and also failed to
 * parse a completely valid test PDF during testing, so it was dropped).
 * pdfjs-dist ships as ESM only as of v6, loaded here via dynamic import()
 * from this CommonJS module, which Node supports natively.
 *
 * Note: only PDF is supported in this version. EPUB parsing needs a
 * different library and different chapter/page semantics (EPUBs don't
 * have fixed page numbers) — noted as a known limitation.
 */

async function extractPdfPages(buffer) {
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const path = require('path');

  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(buffer),
    useWorkerFetch: false,
    isEvalSupported: false, // extra safety: disable eval-based optimizations for untrusted input
    standardFontDataUrl: path.join(require.resolve('pdfjs-dist/package.json'), '..', 'standard_fonts') + path.sep,
  });
  const pdfDocument = await loadingTask.promise;

  const pages = [];
  for (let i = 1; i <= pdfDocument.numPages; i++) {
    const page = await pdfDocument.getPage(i);
    const textContent = await page.getTextContent();
    const text = textContent.items.map((item) => item.str).join(' ');
    pages.push(text);
  }

  const numPages = pdfDocument.numPages;
  await loadingTask.destroy();
  return { pages, numPages };
}

module.exports = { extractPdfPages };
