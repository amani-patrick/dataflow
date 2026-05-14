import { useState } from 'react';
import { FileText, Download, RefreshCw, Trash2, Eye, Layout, Wand2, CheckCircle2, AlertCircle, Info, Shield } from 'lucide-react';
import DropZone from '../components/DropZone.jsx';

const API = import.meta.env.VITE_API_URL || '';

export default function PdfTool() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [vault, setVault] = useState([]);

  const startAnalysis = async () => {
    if (!files.length) return;
    setAnalyzing(true);
    setStatus(null);
    try {
      const fd = new FormData();
      fd.append('files', files[0]);
      const res = await fetch(`${API}/api/pdf/analyze`, { method: 'POST', body: fd });
      const data = await res.json();
      if (data.success) {
        setPreviewData(data);
        setStatus({ type: 'success', msg: `Jarvis detected ${data.rowCount} rows and ${data.images.length} graphical elements.` });
      }
    } catch (err) { setStatus({ type: 'error', msg: 'Structural analysis failed.' }); }
    setAnalyzing(false);
  };

  const handleConvert = async () => {
    if (!files.length) return;
    setLoading(true);
    setStatus(null);
    try {
      const fd = new FormData();
      files.forEach((f) => fd.append('files', f));
      const res = await fetch(`${API}/api/pdf/convert`, { method: 'POST', body: fd });
      const data = await res.json();
      if (data.success) {
        setVault([{ url: data.downloadUrl, name: data.fileName, time: new Date().toLocaleTimeString() }, ...vault]);
        setStatus({ type: 'success', msg: 'High-fidelity extraction complete. Result stored in Vault.' });
      } else {
        setStatus({ type: 'error', msg: 'Conversion failed.' });
      }
    } catch { setStatus({ type: 'error', msg: 'Could not reach the DataFlow engine.' }); }
    setLoading(false);
  };

  return (
    <div className="pdf-stark-container">
      <div className="full-panel" style={{ marginBottom: 24, border: '1px solid var(--gray-200)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <img src="/Data_Flow_logo.png" alt="Logo" style={{ height: '32px', width: 'auto' }} />
          <div>
            <h2 style={{ margin: 0, fontFamily: 'Syne', fontSize: '1.2rem' }}>Smart PDF Engine</h2>
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--gray-500)' }}>Positional table extraction & alignment</p>
          </div>
        </div>

        <div className="info-banner">
          <Info size={16} />
          <span>Jarvis uses <strong>Positional Analysis</strong> to map text coordinates. Best for reports and digital tables.</span>
        </div>

        <DropZone
          accept=".pdf"
          files={files}
          onFiles={(newFiles) => { setFiles(newFiles); setStatus(null); setPreviewData(null); }}
          label="Initialize PDF documents for structural analysis"
        />

        {files.length > 0 && (
          <div style={{ marginTop: 24, display: 'flex', gap: 12 }}>
            <button className="btn-jarvis-secondary" onClick={startAnalysis} disabled={analyzing || loading}>
              {analyzing ? <RefreshCw size={16} className="spin" /> : <Eye size={16} />}
              {analyzing ? 'Analyzing Structure...' : 'Preview Structure'}
            </button>
            <button className="btn-jarvis-primary" onClick={handleConvert} disabled={loading || analyzing}>
              {loading ? <span className="spinner-white" /> : <Wand2 size={16} />}
              Run Smart Extraction
            </button>
          </div>
        )}
      </div>

      {status && (
        <div className={`pdf-status-card ${status.type}`}>
          {status.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{status.type === 'success' ? 'Ready for Extraction' : 'Issue Detected'}</div>
            <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>{status.msg}</div>
          </div>
        </div>
      )}

      {previewData && (
        <div className="table-preview-mock">
          <div className="preview-header"><Layout size={14} /> Structural Alignment Map</div>
          {previewData.images.length > 0 && (
            <div className="logo-alert"><AlertCircle size={14} /><span>Jarvis found <strong>{previewData.images.length} logos</strong>. These will be ignored for clean Excel output.</span></div>
          )}
          <div className="grid-placeholder">
            {previewData.rows.slice(0, 8).map((row, i) => (
              <div key={i} className="grid-row-mock">
                {row.map((cell, j) => (<div key={j} className="grid-cell-mock" title={cell} style={{ width: `${Math.min(cell.length * 8, 150)}px`, opacity: 0.6 }}></div>))}
              </div>
            ))}
          </div>
        </div>
      )}

      {vault.length > 0 && (
        <div className="vault-panel">
          <div className="panel-label" style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', fontWeight: 800, color: 'var(--gray-500)', marginBottom: 12 }}>
            <Shield size={14} color="var(--orange)" /> OUTPUT VAULT
          </div>
          <div className="vault-list">
            {vault.map((item, i) => (
              <div key={i} className="vault-item">
                <div className="v-info">
                  <div className="v-name">{item.name}</div>
                  <div className="v-time">Processed at {item.time} · Expiring in 1hr</div>
                </div>
                <a href={`${API}${item.url}`} className="v-btn" target="_blank" rel="noreferrer"><Download size={14} /> Download</a>
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`
        .pdf-stark-container { max-width: 800px; margin: 0 auto; animation: fadeIn 0.4s ease-out; }
        .pdf-orb { background: #ef4444; padding: 10px; border-radius: 12px; display: flex; box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3); }
        .info-banner { background: var(--gray-100); padding: 12px 16px; border-radius: 12px; font-size: 0.8rem; display: flex; gap: 10px; align-items: center; margin-bottom: 20px; color: var(--gray-600); }
        .btn-jarvis-primary { flex: 1; background: var(--black); color: white; border: none; padding: 14px; border-radius: 12px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; transition: all 0.2s; font-family: Syne; }
        .btn-jarvis-secondary { flex: 1; background: white; border: 1px solid var(--gray-200); color: var(--black); padding: 14px; border-radius: 12px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; font-family: Syne; transition: all 0.2s; }
        .pdf-status-card { margin-top: 24px; padding: 16px 20px; border-radius: 16px; display: flex; gap: 16px; align-items: center; animation: slideIn 0.3s ease-out; }
        .pdf-status-card.success { background: #f0fdf4; color: #166534; border: 1px solid #dcfce7; }
        .pdf-status-card.error { background: #fef2f2; color: #991b1b; border: 1px solid #fee2e2; }
        .table-preview-mock { margin-top: 24px; background: #fafafa; border: 1px solid var(--gray-200); border-radius: 16px; padding: 20px; }
        .preview-header { font-size: 0.75rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: var(--gray-400); margin-bottom: 16px; display: flex; align-items: center; gap: 8px; }
        .logo-alert { background: #fffbeb; border: 1px solid #fde68a; padding: 10px 14px; border-radius: 10px; font-size: 0.75rem; color: #92400e; display: flex; gap: 10px; align-items: center; margin-bottom: 16px; }
        .grid-placeholder { display: flex; flex-direction: column; gap: 10px; }
        .grid-row-mock { display: flex; gap: 10px; }
        .grid-cell-mock { height: 14px; background: var(--gray-300); border-radius: 4px; }
        .spin { animation: spin 1s linear infinite; }
        .spinner-white { width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </div>
  );
}
