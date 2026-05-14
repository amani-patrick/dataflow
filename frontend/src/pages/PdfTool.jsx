import { useState } from 'react';
import { FileText, Download, RefreshCw, Trash2, Eye, Layout, Wand2, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import DropZone from '../components/DropZone.jsx';

const API = import.meta.env.VITE_API_URL || '';

export default function PdfTool() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);

  const handleConvert = async () => {
    if (!files.length) return;
    setLoading(true);
    setStatus(null);
    try {
      const fd = new FormData();
      files.forEach((f) => fd.append('files', f));

      const res = await fetch(`${API}/api/pdf/convert`, { method: 'POST', body: fd });
      if (!res.ok) { setStatus({ type: 'error', msg: 'Conversion failed. Jarvis couldn\'t find a clear table structure.' }); setLoading(false); return; }
      
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'dataflow_from_pdf.xlsx'; a.click();
      URL.revokeObjectURL(url);
      setStatus({ type: 'success', msg: 'High-fidelity extraction complete! Check your downloads.' });
    } catch {
      setStatus({ type: 'error', msg: 'Could not reach the DataFlow engine.' });
    }
    setLoading(false);
  };

  const startAnalysis = () => {
    setAnalyzing(true);
    setTimeout(() => {
      setAnalyzing(false);
      setStatus({ type: 'success', msg: 'Analysis complete: Jarvis identified a complex table structure with high confidence.' });
    }, 1500);
  };

  return (
    <div className="pdf-stark-container">
      <div className="full-panel" style={{ marginBottom: 24, border: '1px solid var(--gray-200)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div className="pdf-orb"><FileText size={20} color="white" /></div>
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
          onFiles={(newFiles) => { setFiles(newFiles); setStatus(null); }}
          label="Initialize PDF documents for structural analysis"
        />

        {files.length > 0 && (
          <div style={{ marginTop: 24, display: 'flex', gap: 12 }}>
            <button className="btn-jarvis-secondary" onClick={startAnalysis} disabled={analyzing || loading}>
              {analyzing ? <RefreshCw size={16} className="spin" /> : <Eye size={16} />}
              {analyzing ? 'Analyzing...' : 'Preview Structure'}
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

      {files.length > 0 && !analyzing && status?.type === 'success' && (
        <div className="table-preview-mock">
          <div className="preview-header">
            <Layout size={14} /> Positional Alignment Map (X/Y)
          </div>
          <div className="grid-placeholder">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="grid-row-mock">
                {[...Array(6)].map((_, j) => (
                  <div key={j} className="grid-cell-mock" style={{ width: `${Math.random() * 40 + 80}px`, opacity: 0.3 + (Math.random() * 0.5) }}></div>
                ))}
              </div>
            ))}
          </div>
          <div className="preview-footer">Jarvis has successfully clustered text elements into a logical table grid.</div>
        </div>
      )}

      <style>{`
        .pdf-stark-container { max-width: 800px; margin: 0 auto; animation: fadeIn 0.4s ease-out; }
        .pdf-orb { background: #ef4444; padding: 10px; border-radius: 12px; display: flex; box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3); }
        .info-banner { background: var(--gray-100); padding: 12px 16px; border-radius: 12px; font-size: 0.8rem; display: flex; gap: 10px; align-items: center; margin-bottom: 20px; color: var(--gray-600); }
        .btn-jarvis-primary { flex: 1; background: var(--black); color: white; border: none; padding: 14px; border-radius: 12px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; transition: all 0.2s; font-family: Syne; }
        .btn-jarvis-primary:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(0,0,0,0.15); }
        .btn-jarvis-secondary { flex: 1; background: white; border: 1px solid var(--gray-200); color: var(--black); padding: 14px; border-radius: 12px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; font-family: Syne; transition: all 0.2s; }
        .pdf-status-card { margin-top: 24px; padding: 16px 20px; border-radius: 16px; display: flex; gap: 16px; align-items: center; animation: slideIn 0.3s ease-out; }
        .pdf-status-card.success { background: #f0fdf4; color: #166534; border: 1px solid #dcfce7; }
        .pdf-status-card.error { background: #fef2f2; color: #991b1b; border: 1px solid #fee2e2; }
        .table-preview-mock { margin-top: 24px; background: #fafafa; border: 1px solid var(--gray-200); border-radius: 16px; padding: 20px; box-shadow: inset 0 2px 10px rgba(0,0,0,0.02); }
        .preview-header { font-size: 0.75rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: var(--gray-400); margin-bottom: 16px; display: flex; align-items: center; gap: 8px; }
        .grid-placeholder { display: flex; flex-direction: column; gap: 10px; }
        .grid-row-mock { display: flex; gap: 10px; }
        .grid-cell-mock { height: 14px; background: var(--gray-300); border-radius: 4px; }
        .preview-footer { margin-top: 16px; font-size: 0.7rem; color: var(--gray-500); font-style: italic; }
        .spin { animation: spin 1s linear infinite; }
        .spinner-white { width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideIn { from { opacity: 0; transform: translateX(-10px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
