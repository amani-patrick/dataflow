import { useState, useMemo } from 'react';
import { Archive, Image, Download, Info, Zap, Shield, Target, MousePointer2, Sparkles, AlertCircle } from 'lucide-react';
import DropZone from '../components/DropZone.jsx';

const API = import.meta.env.VITE_API_URL || '';

const ALGORITHMS = [
  { id: 'zip', name: 'Deflate (ZIP)', speed: 5, ratio: 3, bestFor: 'General files, Mixed data', color: '#3b82f6' },
  { id: 'brotli', name: 'Brotli', speed: 2, ratio: 5, bestFor: 'Text, HTML, JSON, JS', color: '#10b981' },
  { id: 'lz4', name: 'LZ4', speed: 5, ratio: 2, bestFor: 'High-speed, Low CPU', color: '#f59e0b' },
  { id: 'lzma', name: 'LZMA (7z)', speed: 1, ratio: 5, bestFor: 'Ultra-small archives', color: '#8b5cf6' },
  { id: 'gzip', name: 'GZIP', speed: 4, ratio: 3, bestFor: 'Classic web standard', color: '#6366f1' },
];

const IMAGE_FORMATS = [
  { id: 'jpeg', name: 'JPEG', desc: 'Standard quality' },
  { id: 'webp', name: 'WebP', desc: 'Modern high-ratio' },
  { id: 'avif', name: 'AVIF', desc: 'Next-gen smallest' },
];

export default function CompressTool() {
  const [mode, setMode] = useState('lossless'); // 'lossless' | 'images'
  const [files, setFiles] = useState([]);
  const [selectedAlgo, setSelectedAlgo] = useState('zip');
  const [selectedFormat, setSelectedFormat] = useState('jpeg');
  const [quality, setQuality] = useState(75);
  const [targetSize, setTargetSize] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);

  const totalSize = files.reduce((a, f) => a + f.size, 0);
  const fmtSize = (b) => b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${(b / 1024).toFixed(0)} KB`;

  const recommendation = useMemo(() => {
    if (!files.length) return null;
    const hasText = files.some(f => /\.(txt|json|html|js|css|csv)$/i.test(f.name));
    const hasImages = files.some(f => /\.(png|jpg|jpeg|webp)$/i.test(f.name));
    
    if (hasText && !hasImages) return { algo: 'brotli', reason: 'High text density detected. Brotli will pack this tightest.' };
    if (totalSize > 50 * 1024 * 1024) return { algo: 'lzma', reason: 'Large archive detected. LZMA offers the best ratio for big backups.' };
    return { algo: 'zip', reason: 'Balanced mix. Standard ZIP is your best all-rounder.' };
  }, [files, totalSize]);

  const handleCompress = async () => {
    if (!files.length) return;
    setLoading(true);
    setStatus(null);
    try {
      const fd = new FormData();
      files.forEach((f) => fd.append('files', f));
      
      let endpoint = '/api/compress/process';
      if (mode === 'images') {
        endpoint = '/api/compress/images';
        fd.append('quality', quality);
        fd.append('format', selectedFormat);
      } else {
        fd.append('algo', selectedAlgo);
        fd.append('level', 9);
        if (targetSize) fd.append('targetSize', targetSize);
      }

      const res = await fetch(`${API}${endpoint}`, { method: 'POST', body: fd });
      if (!res.ok) { setStatus({ type: 'error', msg: 'Compression failed.' }); setLoading(false); return; }
      
      const blob = await res.blob();
      const compressedSize = blob.size;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dataflow_compressed_${Date.now()}${mode === 'images' ? '.zip' : (ALGORITHMS.find(a => a.id === selectedAlgo)?.id === 'zip' ? '.zip' : '.tar.gz')}`;
      a.click();
      URL.revokeObjectURL(url);
      
      const saved = totalSize > compressedSize ? Math.round((1 - compressedSize / totalSize) * 100) : 0;
      setStatus({ type: 'success', msg: `Done! ${fmtSize(compressedSize)} · saved ~${saved}%.` });
    } catch {
      setStatus({ type: 'error', msg: 'Could not reach server.' });
    }
    setLoading(false);
  };

  return (
    <div className="stark-container">
      {/* Header Panel */}
      <div className="full-panel" style={{ marginBottom: 24, border: '1px solid var(--gray-200)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div className="icon-badge"><Zap size={20} color="var(--orange)" /></div>
          <div>
            <h2 style={{ margin: 0, fontFamily: 'Syne', fontSize: '1.2rem' }}>Compress Engine</h2>
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--gray-500)' }}>Pro-grade optimization for any data type</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 24, background: 'var(--gray-100)', padding: 4, borderRadius: 12 }}>
          <button 
            className={`tab-btn ${mode === 'lossless' ? 'active' : ''}`}
            onClick={() => setMode('lossless')}
          >Lossless Archive</button>
          <button 
            className={`tab-btn ${mode === 'images' ? 'active' : ''}`}
            onClick={() => setMode('images')}
          >Image Optimizer</button>
        </div>

        <DropZone
          accept={mode === 'images' ? '.jpg,.jpeg,.png,.webp' : '*'}
          files={files}
          onFiles={setFiles}
          label={mode === 'images' ? 'Drop images here' : 'Drop any files to compress'}
        />
      </div>

      {files.length > 0 && (
        <>
          {/* Recommendation */}
          {recommendation && mode === 'lossless' && (
            <div className="recommendation-card">
              <Sparkles size={16} color="var(--orange)" />
              <div style={{ flex: 1 }}>
                <span style={{ fontWeight: 700 }}>Jarvis suggests:</span> {recommendation.reason}
                <button 
                  onClick={() => setSelectedAlgo(recommendation.algo)}
                  className="btn-tiny"
                  style={{ marginLeft: 8 }}
                >Apply {ALGORITHMS.find(a => a.id === recommendation.algo)?.name}</button>
              </div>
            </div>
          )}

          {/* Config Grid */}
          <div className="config-grid">
            {/* Left: Algorithm Picker */}
            <div className="panel" style={{ flex: 2 }}>
              <div className="panel-label">
                {mode === 'lossless' ? 'Select Algorithm' : 'Select Format'}
              </div>
              
              <div className="algo-list">
                {(mode === 'lossless' ? ALGORITHMS : IMAGE_FORMATS).map((item) => (
                  <div 
                    key={item.id}
                    className={`algo-card ${ (mode === 'lossless' ? selectedAlgo : selectedFormat) === item.id ? 'active' : ''}`}
                    onClick={() => mode === 'lossless' ? setSelectedAlgo(item.id) : setSelectedFormat(item.id)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="algo-name">{item.name}</span>
                      { (mode === 'lossless' ? selectedAlgo : selectedFormat) === item.id && <MousePointer2 size={14} color="var(--orange)" /> }
                    </div>
                    {mode === 'lossless' ? (
                      <>
                        <div className="algo-meta">Best for: {item.bestFor}</div>
                        <div className="stat-bars">
                          <div className="stat-row">
                            <span>Speed</span>
                            <div className="bar"><div className="fill" style={{ width: `${item.speed * 20}%`, background: item.color }} /></div>
                          </div>
                          <div className="stat-row">
                            <span>Ratio</span>
                            <div className="bar"><div className="fill" style={{ width: `${item.ratio * 20}%`, background: item.color }} /></div>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="algo-meta">{item.desc}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Target & Estimates */}
            <div className="panel" style={{ flex: 1 }}>
              <div className="panel-label">Optimization Goal</div>
              
              {mode === 'lossless' ? (
                <div className="target-input-group">
                  <label><Target size={14} /> Target Size (MB)</label>
                  <input 
                    type="number" 
                    placeholder="e.g. 2" 
                    value={targetSize}
                    onChange={(e) => setTargetSize(e.target.value)}
                  />
                  <div style={{ fontSize: '0.7rem', color: 'var(--gray-500)', marginTop: 8 }}>
                    <Info size={10} /> We'll attempt to reach this size by tuning compression levels.
                  </div>
                </div>
              ) : (
                <div className="quality-slider">
                   <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <label>Quality</label>
                    <span style={{ color: 'var(--orange)', fontWeight: 700 }}>{quality}%</span>
                  </div>
                  <input 
                    type="range" min="10" max="95" value={quality}
                    onChange={(e) => setQuality(e.target.value)}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--gray-500)', marginTop: 4 }}>
                    <span>Tiny</span><span>Crisp</span>
                  </div>
                </div>
              )}

              <div className="estimate-panel">
                <div className="estimate-header">Current: {fmtSize(totalSize)}</div>
                <div className="estimate-row">
                  <span>Estimated Output</span>
                  <span style={{ fontWeight: 700, color: 'var(--orange)' }}>
                    ~{mode === 'lossless' 
                        ? fmtSize(totalSize * (1 - (ALGORITHMS.find(a => a.id === selectedAlgo)?.ratio || 3) * 0.15))
                        : fmtSize(totalSize * (quality / 150))
                    }
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Bar */}
          <div className="action-bar-stark">
            {status && (
              <div className={`status-pill ${status.type}`}>
                {status.type === 'error' ? <AlertCircle size={14} /> : <Shield size={14} />}
                {status.msg}
              </div>
            )}
            <button className="btn-stark" onClick={handleCompress} disabled={loading}>
              {loading ? <span className="spinner-white" /> : <Download size={18} />}
              {loading ? 'Processing...' : 'Run Optimization'}
            </button>
          </div>
        </>
      )}

      <style>{`
        .stark-container { max-width: 1000px; margin: 0 auto; animation: fadeIn 0.4s ease-out; }
        .icon-badge { background: var(--orange-pale); padding: 10px; borderRadius: 12px; display: flex; }
        .tab-btn { flex: 1; padding: 10px; border: none; background: transparent; border-radius: 8px; font-weight: 600; font-size: 0.85rem; cursor: pointer; transition: all 0.2s; color: var(--gray-500); }
        .tab-btn.active { background: var(--white); color: var(--black); box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
        .recommendation-card { background: #fffbeb; border: 1px solid #fde68a; padding: 12px 16px; border-radius: 12px; display: flex; align-items: center; gap: 12px; font-size: 0.85rem; margin-bottom: 20px; color: #92400e; }
        .btn-tiny { background: var(--orange); color: white; border: none; padding: 4px 8px; border-radius: 6px; font-size: 0.75rem; font-weight: 700; cursor: pointer; }
        .config-grid { display: flex; gap: 20px; margin-bottom: 24px; }
        .panel { background: white; border: 1px solid var(--gray-200); border-radius: 16px; padding: 20px; }
        .panel-label { font-family: Syne; font-weight: 700; font-size: 0.9rem; margin-bottom: 16px; color: var(--black); }
        .algo-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 12px; }
        .algo-card { border: 2px solid var(--gray-100); padding: 12px; border-radius: 12px; cursor: pointer; transition: all 0.2s; position: relative; overflow: hidden; }
        .algo-card.active { border-color: var(--orange); background: var(--orange-pale); }
        .algo-name { font-weight: 700; font-size: 0.85rem; }
        .algo-meta { font-size: 0.7rem; color: var(--gray-500); margin-top: 4px; }
        .stat-bars { margin-top: 10px; }
        .stat-row { display: flex; align-items: center; gap: 8px; font-size: 0.65rem; color: var(--gray-400); margin-bottom: 4px; }
        .bar { flex: 1; height: 4px; background: var(--gray-100); border-radius: 2px; overflow: hidden; }
        .fill { height: 100%; transition: width 0.3s ease; }
        .target-input-group label { display: block; font-size: 0.75rem; font-weight: 600; margin-bottom: 8px; color: var(--gray-600); }
        .target-input-group input { width: 100%; padding: 10px; border: 1px solid var(--gray-200); border-radius: 8px; font-size: 0.9rem; font-family: 'Inter', sans-serif; }
        .estimate-panel { margin-top: 24px; padding-top: 16px; border-top: 1px dashed var(--gray-200); }
        .estimate-header { font-size: 0.7rem; color: var(--gray-400); text-transform: uppercase; letter-spacing: 0.05em; }
        .estimate-row { display: flex; justify-content: space-between; align-items: center; margin-top: 8px; font-size: 0.9rem; }
        .action-bar-stark { display: flex; justify-content: flex-end; align-items: center; gap: 20px; margin-top: 32px; padding-top: 20px; border-top: 1px solid var(--gray-100); }
        .status-pill { display: flex; align-items: center; gap: 8px; padding: 8px 14px; border-radius: 20px; font-size: 0.8rem; font-weight: 600; }
        .status-pill.success { background: #ecfdf5; color: #059669; }
        .status-pill.error { background: #fef2f2; color: #dc2626; }
        .btn-stark { background: var(--black); color: white; border: none; padding: 14px 28px; border-radius: 12px; font-family: Syne; font-weight: 700; font-size: 1rem; display: flex; align-items: center; gap: 10px; cursor: pointer; transition: all 0.2s; }
        .btn-stark:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(0,0,0,0.15); }
        .spinner-white { width: 18px; height: 18px; border: 3px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.8s linear infinite; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
