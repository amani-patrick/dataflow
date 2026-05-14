import express from 'express';
import pdfParse from 'pdf-parse/lib/pdf-parse.js';
import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function parseTableFromText(text) {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const rows = [];

  for (const line of lines) {
    // Try tab-separated first
    if (line.includes('\t')) {
      rows.push(line.split('\t').map((c) => c.trim()));
    } else {
      // Try multiple-space separation (common in PDF tables)
      const cells = line.split(/\s{2,}/).map((c) => c.trim()).filter(Boolean);
      if (cells.length > 1) rows.push(cells);
      else if (cells.length === 1) rows.push(cells);
    }
  }

  return rows;
}

function rowsToObjects(rows) {
  if (rows.length === 0) return { headers: [], data: [] };
  const maxCols = Math.max(...rows.map((r) => r.length));
  // Use first row as headers if it looks like headers (no pure numbers)
  const firstRow = rows[0];
  const isHeader = firstRow.some((c) => isNaN(parseFloat(c)));

  if (isHeader) {
    const headers = firstRow.map((h, i) => h || `Column ${i + 1}`);
    const data = rows.slice(1).map((row) => {
      const obj = {};
      headers.forEach((h, i) => { obj[h] = row[i] !== undefined ? row[i] : ''; });
      return obj;
    });
    return { headers, data };
  } else {
    const headers = Array.from({ length: maxCols }, (_, i) => `Column ${i + 1}`);
    const data = rows.map((row) => {
      const obj = {};
      headers.forEach((h, i) => { obj[h] = row[i] !== undefined ? row[i] : ''; });
      return obj;
    });
    return { headers, data };
  }
}

export default function pdfRoutes(upload) {
  const router = express.Router();

  router.post('/convert', upload.array('files', 5), async (req, res) => {
    try {
      const wb = XLSX.utils.book_new();

      for (const file of req.files) {
        const buf = fs.readFileSync(file.path);
        const parsed = await pdfParse(buf);
        const rawRows = parseTableFromText(parsed.text);
        const { headers, data } = rowsToObjects(rawRows);

        const sheetName = file.originalname.replace(/\.pdf$/i, '').slice(0, 31);
        const ws = XLSX.utils.json_to_sheet(data, { header: headers });

        // Style headers
        const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
        for (let c = range.s.c; c <= range.e.c; c++) {
          const cell = XLSX.utils.encode_cell({ r: 0, c });
          if (ws[cell]) {
            ws[cell].s = {
              font: { bold: true, color: { rgb: 'FFFFFF' } },
              fill: { fgColor: { rgb: 'E8692A' } },
            };
          }
        }

        XLSX.utils.book_append_sheet(wb, ws, sheetName);
        fs.unlinkSync(file.path);
      }

      const outPath = path.join(__dirname, '../../uploads/', `dataflow_pdf_${Date.now()}.xlsx`);
      XLSX.writeFile(wb, outPath);

      res.download(outPath, 'dataflow_from_pdf.xlsx', () => {
        fs.unlink(outPath, () => {});
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  return router;
}
