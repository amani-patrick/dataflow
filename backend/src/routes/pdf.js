import express from 'express';
import PDFParser from 'pdf2json';
import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Advanced PDF Table Parser
 * Uses positional data (x, y coordinates) to reconstruct tables
 */
async function parsePdfToRows(filePath) {
  return new Promise((resolve, reject) => {
    const pdfParser = new PDFParser();

    pdfParser.on('pdfParser_dataError', (errData) => reject(errData.parserError));
    pdfParser.on('pdfParser_dataReady', (pdfData) => {
      const rows = [];
      
      // Iterate through pages
      pdfData.Pages.forEach((page) => {
        const textElements = page.Texts.map((t) => ({
          x: t.x,
          y: t.y,
          text: decodeURIComponent(t.R[0].T),
          w: t.w,
        }));

        if (textElements.length === 0) return;

        // Group by Y coordinate (rows) with a small threshold
        const yThreshold = 0.5; 
        const yGroups = [];
        
        textElements.sort((a, b) => a.y - b.y).forEach((el) => {
          let group = yGroups.find((g) => Math.abs(g.y - el.y) < yThreshold);
          if (!group) {
            group = { y: el.y, elements: [] };
            yGroups.push(group);
          }
          group.elements.push(el);
        });

        // For each Y group, sort by X and identify cells
        yGroups.forEach((group) => {
          group.elements.sort((a, b) => a.x - b.x);
          
          // Cluster elements that are very close horizontally into single cells
          const xThreshold = 1.0;
          const cells = [];
          group.elements.forEach((el) => {
            if (cells.length > 0 && (el.x - (cells[cells.length - 1].x + cells[cells.length - 1].w)) < xThreshold) {
              cells[cells.length - 1].text += ' ' + el.text;
              cells[cells.length - 1].w += el.w;
            } else {
              cells.push({ ...el });
            }
          });
          
          rows.push(cells.map(c => c.text.trim()));
        });
      });

      resolve(rows);
    });

    pdfParser.loadPDF(filePath);
  });
}

function rowsToObjects(rows) {
  if (rows.length === 0) return { headers: [], data: [] };
  
  // Find the row with the most cells to determine column count
  const maxCols = Math.max(...rows.map((r) => r.length));
  
  // Heuristic: The first row with many columns is likely the header
  let headerIndex = rows.findIndex(r => r.length >= maxCols * 0.7);
  if (headerIndex === -1) headerIndex = 0;

  const rawHeaders = rows[headerIndex];
  const headers = rawHeaders.map((h, i) => h || `Column_${i + 1}`);

  const data = rows.slice(headerIndex + 1)
    .filter(row => row.length > 0)
    .map((row) => {
      const obj = {};
      headers.forEach((h, i) => {
        obj[h] = row[i] !== undefined ? row[i] : '';
      });
      return obj;
    });

  return { headers, data };
}

export default function pdfRoutes(upload) {
  const router = express.Router();

  router.post('/convert', upload.array('files', 5), async (req, res) => {
    try {
      const wb = XLSX.utils.book_new();

      for (const file of req.files) {
        const rawRows = await parsePdfToRows(file.path);
        const { headers, data } = rowsToObjects(rawRows);

        const sheetName = file.originalname.replace(/\.pdf$/i, '').slice(0, 31);
        const ws = XLSX.utils.json_to_sheet(data, { header: headers });

        // Basic auto-width
        const colWidths = headers.map(h => ({ wch: Math.max(h.length, 10) }));
        ws['!cols'] = colWidths;

        XLSX.utils.book_append_sheet(wb, ws, sheetName);
        fs.unlinkSync(file.path);
      }

      const outPath = path.join(__dirname, '../../uploads/', `dataflow_pdf_${Date.now()}.xlsx`);
      XLSX.writeFile(wb, outPath);

      res.download(outPath, 'dataflow_from_pdf.xlsx', () => {
        fs.unlink(outPath, () => {});
      });
    } catch (err) {
      console.error('PDF Conversion Error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  return router;
}
