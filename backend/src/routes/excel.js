import express from 'express';
import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as dfd from 'danfojs-node';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Pipeline Engine
 * Executes a sequence of data operations using Danfo.js
 */
async function runPipeline(dataframes, pipeline) {
  let df = dataframes.length > 1 
    ? dfd.concat({ df_list: dataframes, axis: 0 }) 
    : dataframes[0];

  for (const step of pipeline) {
    const { action, params } = step;

    switch (action) {
      case 'fill_missing':
        df.fillNa(params.value, { inplace: true });
        break;

      case 'drop_duplicates':
        df.dropDuplicates({ keep: 'first', inplace: true });
        break;

      case 'drop_columns':
        df.drop({ columns: params.columns, inplace: true });
        break;

      case 'group_by':
        const group = df.groupBy(params.columns);
        const aggMap = {};
        params.aggregations.forEach(a => {
          aggMap[a.column] = [a.method];
        });
        df = group.agg(aggMap);
        break;

      case 'sort':
        df.sortValues(params.column, { ascending: params.direction === 'asc', inplace: true });
        break;

      case 'trim':
        // Custom string trim for all object columns
        df.columns.forEach(col => {
          if (df[col].dtype === 'string') {
            const trimmed = df[col].values.map(v => typeof v === 'string' ? v.trim() : v);
            df.addColumn(col, trimmed, { atIndex: df.columns.indexOf(col) });
          }
        });
        break;

      case 'filter':
        // Basic filter logic
        const { column, operator, value } = params;
        if (operator === '==') df = df.loc({ rows: df[column].eq(value) });
        else if (operator === '>') df = df.loc({ rows: df[column].gt(value) });
        else if (operator === '<') df = df.loc({ rows: df[column].lt(value) });
        break;
        
      default:
        console.warn(`Unknown pipeline action: ${action}`);
    }
  }

  return df;
}

export default function excelRoutes(upload) {
  const router = express.Router();

  // Unified pipeline processing
  router.post('/process', upload.array('files', 20), async (req, res) => {
    try {
      const pipeline = req.body.pipeline ? JSON.parse(req.body.pipeline) : [];
      const dataframes = [];

      for (const file of req.files) {
        const wb = XLSX.readFile(file.path);
        const firstSheet = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(firstSheet);
        dataframes.push(new dfd.DataFrame(json));
        fs.unlinkSync(file.path);
      }

      if (dataframes.length === 0) throw new Error('No files uploaded');

      const resultDf = await runPipeline(dataframes, pipeline);

      const outPath = path.join(__dirname, '../../uploads/', `dataflow_result_${Date.now()}.xlsx`);
      
      // Convert Danfo DataFrame back to Excel
      const resultJson = dfd.toJSON(resultDf);
      const ws = XLSX.utils.json_to_sheet(resultJson);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Result');
      XLSX.writeFile(wb, outPath);

      res.download(outPath, 'dataflow_processed.xlsx', () => {
        fs.unlink(outPath, () => {});
      });
    } catch (err) {
      console.error('Excel Pipeline Error:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Health check/Stats
  router.post('/stats', upload.array('files', 10), async (req, res) => {
    try {
      const stats = [];
      for (const file of req.files) {
        const wb = XLSX.readFile(file.path);
        const json = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
        const df = new dfd.DataFrame(json);
        
        const colStats = {};
        df.columns.forEach(col => {
          colStats[col] = {
            type: df[col].dtype,
            nullCount: df[col].isna().sum(),
            uniqueCount: df[col].unique().shape[0],
          };
        });
        
        stats.push({ filename: file.originalname, columns: colStats, rowCount: df.shape[0] });
        fs.unlinkSync(file.path);
      }
      res.json({ success: true, stats });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  return router;
}
