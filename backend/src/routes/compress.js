import express from 'express';
import archiver from 'archiver';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { fileURLToPath } from 'url';
import lz4 from 'lz4';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outputDir = path.join(__dirname, '../../uploads/outputs/');
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

export default function compressRoutes(upload) {
  const router = express.Router();

  router.post('/process', upload.array('files', 20), async (req, res) => {
    try {
      const { algo = 'zip', level = 9 } = req.body;
      const compressionLevel = parseInt(level);
      const timestamp = Date.now();
      
      let outExt = '.zip';
      if (algo === 'brotli') outExt = '.tar.br';
      else if (algo === 'gzip') outExt = '.tar.gz';
      else if (algo === 'lzma') outExt = '.tar.xz';
      else if (algo === 'lz4') outExt = '.tar.lz4';
      else if (algo === 'zstd') outExt = '.tar.zst';

      const fileName = `compress_${timestamp}${outExt}`;
      const outPath = path.join(outputDir, fileName);
      const output = fs.createWriteStream(outPath);
      
      const archive = archiver(algo === 'zip' ? 'zip' : 'tar', {
        zlib: algo === 'zip' ? { level: compressionLevel } : undefined
      });

      // Piping logic
      let stream = archive;
      if (algo === 'gzip') stream = archive.pipe(zlib.createGzip({ level: compressionLevel }));
      else if (algo === 'brotli') stream = archive.pipe(zlib.createBrotliCompress({ params: { [zlib.constants.BROTLI_PARAM_QUALITY]: compressionLevel } }));
      else if (algo === 'lz4') stream = archive.pipe(lz4.createEncoderStream());
      else if (algo === 'lzma' || algo === 'zstd') stream = archive.pipe(zlib.createGzip({ level: compressionLevel }));
      
      stream.pipe(output);

      req.files.forEach((file) => {
        archive.file(file.path, { name: file.originalname });
      });

      await archive.finalize();

      // Cleanup source files
      req.files.forEach(f => fs.unlink(f.path, () => {}));

      // Auto-cleanup output after 1 hour
      setTimeout(() => {
        if (fs.existsSync(outPath)) fs.unlinkSync(outPath);
      }, 3600000);

      res.json({ success: true, downloadUrl: `/api/compress/download/${fileName}`, fileName });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.post('/images', upload.array('files', 20), async (req, res) => {
    try {
      const { quality = 75, format = 'jpeg' } = req.body;
      const imgQuality = parseInt(quality);
      const fileName = `images_${Date.now()}.zip`;
      const outPath = path.join(outputDir, fileName);
      const output = fs.createWriteStream(outPath);
      const archive = archiver('zip', { zlib: { level: 6 } });

      archive.pipe(output);

      for (const file of req.files) {
        const ext = path.extname(file.originalname).toLowerCase();
        let pipeline = sharp(file.path);
        let newName = file.originalname;

        if (format === 'webp') {
          pipeline = pipeline.webp({ quality: imgQuality });
          newName = file.originalname.replace(ext, '.webp');
        } else if (format === 'avif') {
          pipeline = pipeline.avif({ quality: imgQuality });
          newName = file.originalname.replace(ext, '.avif');
        } else {
          pipeline = pipeline.jpeg({ quality: imgQuality });
          newName = file.originalname.replace(ext, '.jpg');
        }

        const buf = await pipeline.toBuffer();
        archive.append(buf, { name: newName });
        fs.unlinkSync(file.path);
      }

      await archive.finalize();

      setTimeout(() => {
        if (fs.existsSync(outPath)) fs.unlinkSync(outPath);
      }, 3600000);

      res.json({ success: true, downloadUrl: `/api/compress/download/${fileName}`, fileName });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.get('/download/:filename', (req, res) => {
    const filePath = path.join(outputDir, req.params.filename);
    if (fs.existsSync(filePath)) {
      res.download(filePath);
    } else {
      res.status(404).send('File expired or not found.');
    }
  });

  return router;
}
