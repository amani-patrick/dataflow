import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import excelRoutes from './routes/excel.js';
import pdfRoutes from './routes/pdf.js';
import compressRoutes from './routes/compress.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json());

const upload = multer({
  dest: path.join(__dirname, '../uploads/'),
  limits: { fileSize: 50 * 1024 * 1024 },
});

app.use('/api/excel', excelRoutes(upload));
app.use('/api/pdf', pdfRoutes(upload));
app.use('/api/compress', compressRoutes(upload));

app.get('/api/health', (_, res) => res.json({ status: 'ok', version: '1.0.0' }));

app.listen(PORT, () => console.log(`DataFlow API running on :${PORT}`));
