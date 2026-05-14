import express from 'express';
import PDFParser from 'pdf2json';
import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Advanced PDF Table Parser (Log-Aware Version)
 * Uses positional data with vertical continuity checking for multi-line entries
 */
async function parsePdfToRows(filePath) {
  return new Promise((resolve, reject) => {
    const pdfParser = new PDFParser();

    pdfParser.on('pdfParser_dataError', (errData) => reject(errData.parserError));
    pdfParser.on('pdfParser_dataReady', (pdfData) => {
      const rows = [];
      const images = [];
      
      pdfData.Pages.forEach((page, pageIdx) => {
        const textElements = page.Texts.map((t) => ({
          x: t.x,
          y: t.y,
          text: decodeURIComponent(t.R[0].T),
          w: t.w,
          page: pageIdx
        }));

        if (page.Images) {
          page.Images.forEach(img => {
            images.push({ x: img.x, y: img.y, w: img.w, h: img.h, page: pageIdx });
          });
        }

        if (textElements.length === 0) return;

        const yGroups = [];
        const yThreshold = 0.35; 
        
        textElements.sort((a, b) => a.y - b.y).forEach((el) => {
          let group = yGroups.find((g) => Math.abs(g.y - el.y) < yThreshold);
          if (!group) {
            group = { y: el.y, elements: [] };
            yGroups.push(group);
          }
          group.elements.push(el);
        });

        const mergedYGroups = [];
        yGroups.forEach((group, i) => {
          if (i > 0 && (group.y - yGroups[i-1].y) < 0.45) {
            mergedYGroups[mergedYGroups.length - 1].elements.push(...group.elements);
          } else {
            mergedYGroups.push(group);
          }
        });

        mergedYGroups.forEach((group) => {
          group.elements.sort((a, b) => a.x - b.x);
          const xThreshold = 1.2;
          const cells = [];
          group.elements.forEach((el) => {
            const lastCell = cells[cells.length - 1];
            if (lastCell && (el.x - (lastCell.x + lastCell.w)) < xThreshold) {
              lastCell.text += ' ' + el.text;
              lastCell.w = Math.max(lastCell.w, (el.x + el.w) - lastCell.x);
            } else {
              cells.push({ ...el });
            }
          });
          
          if (cells.length > 0) {
            rows.push(cells.map(c => c.text.trim()));
          }
        });
      });

      resolve({ rows, images });
    });

    pdfParser.loadPDF(filePath);
  });
}

function rowsToObjects(rows) {
  if (rows.length === 0) return { headers: [], data: [] };
  const counts = {};
  rows.forEach(r => counts[r.length] = (counts[r.length] || 0) + 1);
  const commonColCount = parseInt(Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b));
  let headerIndex = rows.findIndex(r => r.length === commonColCount);
  if (headerIndex === -1) headerIndex = 0;
  const rawHeaders = rows[headerIndex];
  const headers = rawHeaders.map((h, i) => {
    const clean = String(h).replace(/[^\w\s]/gi, '').trim();
    return clean || `Field_${i + 1}`;
  });
  const data = rows.slice(headerIndex + 1)
    .filter(row => row.length > 0)
    .map((row) => {
      const obj = {};
      headers.forEach((h, i) => { obj[h] = row[i] !== undefined ? row[i] : ''; });
      return obj;
    });
  return { headers, data };
}

export default function pdfRoutes(upload) {
  const router = express.Router();

  // Analysis endpoint for the structural preview
  router.post('/analyze', upload.array('files', 1), async (req, res) => {
    try {
      const file = req.files[0];
      const { rows, images } = await parsePdfToRows(file.path);
      fs.unlinkSync(file.path);
      res.json({ success: true, rows: rows.slice(0, 20), images, rowCount: rows.length });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.post('/convert', upload.array('files', 5), async (req, res) => {
    try {
      const wb = XLSX.utils.book_new();
      for (const file of req.files) {
        const { rows } = await parsePdfToRows(file.path);
        const { headers, data } = rowsToObjects(rows);
        const sheetName = file.originalname.replace(/\.pdf$/i, '').slice(0, 31);
        const ws = XLSX.utils.json_to_sheet(data, { header: headers });
        ws['!cols'] = headers.map(h => ({ wch: Math.max(h.length, 12) }));
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
        fs.unlinkSync(file.path);
      }
      const outPath = path.join(__dirname, '../../uploads/', `dataflow_pdf_${Date.now()}.xlsx`);
      XLSX.writeFile(wb, outPath);
      res.download(outPath, 'dataflow_from_pdf.xlsx', () => { fs.unlink(outPath, () => {}); });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  return router;
}
