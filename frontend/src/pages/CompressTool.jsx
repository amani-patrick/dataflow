import { useState } from 'react';
import { Archive, Image, Download, Info } from 'lucide-react';
import DropZone from '../components/DropZone.jsx';

const API = import.meta.env.VITE_API_URL || '';

export default function CompressTool() {
  const [mode, setMode] = useState('zip'); // 'zip' | 'images'
  const [files, setFiles] = useState([]);
  const [quality, setQuality] = useState(75);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);

  const totalSize = files.reduce((a, f) => a + f.size, 0);
  const fmtSize = (b) => b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${(b / 1024).toFixed(0)} KB`;

  const handleCompress = async () => {
    if (!files.length) return;
    setLoading(true);
    setStatus(null);
    try {
      const fd = new FormData();
      files.forEach((f) => fd.append('files', f));
      if (mode === 'images') fd.append('quality', quality);

      const endpoint = mode === 'images' ? '/api/compress/images' : '/api/compress/zip';
      const res = await fetch(`${API}${endpoint}`, { method: 'POST', body: fd });
      if (!res.ok) { setStatus({ type: 'error', msg: 'Compression failed.' }); setLoading(false); return; }
      const blob = await res.blob();
      const compressedSize = blob.size;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = mode === 'images' ? 'dataflow_compressed_images.zip' : 'dataflow_compressed.zip';
      a.click();
      URL.revokeObjectURL(url);
      const saved = totalSize > compressedSize ? Math.round((1 - compressedSize / totalSize) * 100) : 0;
      setStatus({ type: 'success', msg: `Done! ${fmtSize(compressedSize)} compressed${saved > 0 ? ` · saved ~${saved}%` : ''}. Download started.` });
    } catch {
      setStatus({ type: 'error', msg: 'Could not reach server.' });
    }
    setLoading(false);
  };

  return (
    <div>
      {/* Mode toggle */}
      <div className="full-panel" style={{ marginBottom: 20 }}>
        <div className="tool-panel-title"><Archive size={16} /> Compression Mode</div>
        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          {[
            { id: 'zip', icon: Archive, label: 'ZIP Bundle', desc: 'Pack any files into a compressed .zip' },
            { id: 'images', icon: Image, label: 'Image Optimizer', desc: 'Reduce image file size with quality control' },
          ].map(({ id, icon: Icon, label, desc }) => (
            <button
              key={id}
              onClick={() => { setMode(id); setFiles([]); setStatus(null); }}
              style={{
                flex: 1, padding: '14px 16px', borderRadius: 'var(--radius)',
                border: `2px solid ${mode === id ? 'var(--orange)' : 'var(--gray-100)'}`,
                background: mode === id ? 'var(--orange-pale)' : 'var(--white)',
                textAlign: 'left', cursor: 'pointer', transition: 'all 0.18s',
              }}
            >
              <Icon size={18} color={mode === id ? 'var(--orange)' : 'var(--gray-500)'} style={{ marginBottom: 6 }} />
              <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: '0.9rem', color: mode === id ? 'var(--orange)' : 'var(--black)' }}>{label}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)', marginTop: 2 }}>{desc}</div>
            </button>
          ))}
        </div>

        <DropZone
          accept={mode === 'images' ? '.jpg,.jpeg,.png,.webp' : '*'}
          files={files}
          onFiles={setFiles}
          label={mode === 'images' ? 'Drop images here (.jpg, .png, .webp)' : 'Drop any files to bundle & compress'}
        />

        {/* Image quality slider */}
        {mode === 'images' && files.length > 0 && (
          <div style={{ marginTop: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <label className="field-label">Image Quality</label>
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--orange)' }}>{quality}%</span>
            </div>
            <input
              type="range" min={20} max={95} value={quality}
              onChange={(e) => setQuality(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--orange)' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--gray-500)', marginTop: 3 }}>
              <span>Smaller file</span><span>Best quality</span>
            </div>
          </div>
        )}
      </div>

      {/* Stats */}
      {files.length > 0 && (
        <div style={{
          display: 'flex', gap: 12, marginBottom: 16,
        }}>
          {[
            { label: 'Files', val: files.length },
            { label: 'Total Size', val: fmtSize(totalSize) },
            { label: 'Output', val: 'ZIP Archive' },
          ].map(({ label, val }) => (
            <div key={label} style={{
              flex: 1, padding: '12px 16px', borderRadius: 'var(--radius)',
              background: 'var(--gray-100)', textAlign: 'center',
            }}>
              <div style={{ fontFamily: 'Syne', fontWeight: 700, fontSize: '1.1rem', color: 'var(--black)' }}>{val}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--gray-500)', marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>
      )}

      {files.length > 0 && (
        <div className="action-bar">
          <div className={`status-msg ${status?.type || ''}`}>
            {status ? status.msg : `Ready to compress ${files.length} file${files.length > 1 ? 's' : ''}`}
          </div>
          <button className="btn-primary" onClick={handleCompress} disabled={loading}>
            {loading
              ? <span className="spinner" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} />
              : <Download size={15} />}
            Compress &amp; Download
          </button>
        </div>
      )}

      {!files.length && (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--gray-300)' }}>
          <Archive size={48} strokeWidth={1} style={{ margin: '0 auto 12px', display: 'block' }} />
          <p style={{ fontSize: '0.9rem' }}>Upload files above to compress them</p>
        </div>
      )}
    </div>
  );
}
