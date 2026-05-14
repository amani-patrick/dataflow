import express from 'express';
import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default function excelRoutes(upload) {
  const router = express.Router();

  // Parse uploaded excel files and return preview data
  router.post('/preview', upload.array('files', 10), (req, res) => {
    try {
      const results = req.files.map((file) => {
        const wb = XLSX.readFile(file.path);
        const sheets = wb.SheetNames.map((name) => {
          const ws = wb.Sheets[name];
          const data = XLSX.utils.sheet_to_json(ws, { defval: '' });
          const headers = data.length > 0 ? Object.keys(data[0]) : [];
          return { name, headers, rows: data.slice(0, 50), totalRows: data.length };
        });
        fs.unlinkSync(file.path);
        return { filename: file.originalname, sheets };
      });
      res.json({ success: true, files: results });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Merge multiple sheets/files, fill missing, sort, compute totals
  router.post('/process', upload.array('files', 10), (req, res) => {
    try {
      const options = req.body.options ? JSON.parse(req.body.options) : {};
      const {
        mergeAll = true,
        fillMissing = '',
        sortBy = null,
        sortDir = 'asc',
        removeDuplicates = false,
        sumFields = [],
        removeColumns = [],
      } = options;

      let combined = [];
      let allHeaders = new Set();

      req.files.forEach((file) => {
        const wb = XLSX.readFile(file.path);
        wb.SheetNames.forEach((name) => {
          const ws = wb.Sheets[name];
          const data = XLSX.utils.sheet_to_json(ws, { defval: '' });
          data.forEach((row) => Object.keys(row).forEach((k) => allHeaders.add(k)));
          combined.push(...data);
        });
        fs.unlinkSync(file.path);
      });

      const headers = [...allHeaders].filter((h) => !removeColumns.includes(h));

      // Normalize rows — fill missing fields
      combined = combined.map((row) => {
        const norm = {};
        headers.forEach((h) => {
          norm[h] = row[h] !== undefined && row[h] !== '' ? row[h] : fillMissing;
        });
        return norm;
      });

      // Remove duplicates
      if (removeDuplicates) {
        const seen = new Set();
        combined = combined.filter((row) => {
          const key = JSON.stringify(row);
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      }

      // Sort
      if (sortBy && headers.includes(sortBy)) {
        combined.sort((a, b) => {
          const va = a[sortBy], vb = b[sortBy];
          const numA = parseFloat(va), numB = parseFloat(vb);
          if (!isNaN(numA) && !isNaN(numB)) {
            return sortDir === 'asc' ? numA - numB : numB - numA;
          }
          return sortDir === 'asc'
            ? String(va).localeCompare(String(vb))
            : String(vb).localeCompare(String(va));
        });
      }

      // Sum row for numeric fields
      let summaryRow = null;
      if (sumFields.length > 0) {
        summaryRow = {};
        headers.forEach((h) => {
          if (sumFields.includes(h)) {
            summaryRow[h] = combined.reduce((acc, row) => {
              const n = parseFloat(row[h]);
              return acc + (isNaN(n) ? 0 : n);
            }, 0);
          } else {
            summaryRow[h] = h === headers[0] ? 'TOTAL' : '';
          }
        });
        combined.push(summaryRow);
      }

      // Build output workbook
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(combined, { header: headers });

      // Style header row
      const range = XLSX.utils.decode_range(ws['!ref']);
      for (let c = range.s.c; c <= range.e.c; c++) {
        const cell = XLSX.utils.encode_cell({ r: 0, c });
        if (ws[cell]) {
          ws[cell].s = {
            font: { bold: true, color: { rgb: 'FFFFFF' } },
            fill: { fgColor: { rgb: 'E8692A' } },
            alignment: { horizontal: 'center' },
          };
        }
      }

      // Highlight total row if present
      if (summaryRow) {
        const lastRow = combined.length;
        for (let c = range.s.c; c <= range.e.c; c++) {
          const cell = XLSX.utils.encode_cell({ r: lastRow, c });
          if (ws[cell]) {
            ws[cell].s = {
              font: { bold: true },
              fill: { fgColor: { rgb: 'FFF3E0' } },
            };
          }
        }
      }

      XLSX.utils.book_append_sheet(wb, ws, 'Merged');

      const outPath = path.join(__dirname, '../../uploads/', `dataflow_${Date.now()}.xlsx`);
      XLSX.writeFile(wb, outPath, { bookSST: false });

      res.download(outPath, 'dataflow_merged.xlsx', () => {
        fs.unlink(outPath, () => {});
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  return router;
}
