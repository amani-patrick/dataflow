import express from 'express';
import archiver from 'archiver';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default function compressRoutes(upload) {
  const router = express.Router();

  router.post('/zip', upload.array('files', 20), (req, res) => {
    try {
      const outPath = path.join(__dirname, '../../uploads/', `dataflow_compressed_${Date.now()}.zip`);
      const output = fs.createWriteStream(outPath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      output.on('close', () => {
        res.download(outPath, 'dataflow_compressed.zip', () => {
          fs.unlink(outPath, () => {});
          req.files.forEach((f) => fs.unlink(f.path, () => {}));
        });
      });

      archive.on('error', (err) => {
        throw err;
      });

      archive.pipe(output);
      req.files.forEach((file) => {
        archive.file(file.path, { name: file.originalname });
      });
      archive.finalize();
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Compress images specifically
  router.post('/images', upload.array('files', 20), async (req, res) => {
    try {
      const quality = parseInt(req.body.quality || '75');
      const outPath = path.join(__dirname, '../../uploads/', `dataflow_images_${Date.now()}.zip`);
      const output = fs.createWriteStream(outPath);
      const archive = archiver('zip', { zlib: { level: 6 } });

      output.on('close', () => {
        res.download(outPath, 'dataflow_compressed_images.zip', () => {
          fs.unlink(outPath, () => {});
        });
      });

      archive.pipe(output);

      for (const file of req.files) {
        const ext = path.extname(file.originalname).toLowerCase();
        const imgExts = ['.jpg', '.jpeg', '.png', '.webp'];
        if (imgExts.includes(ext)) {
          const buf = await sharp(file.path)
            .jpeg({ quality })
            .toBuffer();
          archive.append(buf, { name: file.originalname.replace(ext, '.jpg') });
        } else {
          archive.file(file.path, { name: file.originalname });
        }
        fs.unlinkSync(file.path);
      }

      archive.finalize();
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  return router;
}
