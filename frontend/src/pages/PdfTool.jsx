import { useState } from 'react';
import { FileText, Download, Info } from 'lucide-react';
import DropZone from '../components/DropZone.jsx';

const API = import.meta.env.VITE_API_URL || '';

export default function PdfTool() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);

  const handleConvert = async () => {
    if (!files.length) return;
    setLoading(true);
    setStatus(null);
    try {
      const fd = new FormData();
      files.forEach((f) => fd.append('files', f));
      const res = await fetch(`${API}/api/pdf/convert`, { method: 'POST', body: fd });
      if (!res.ok) { setStatus({ type: 'error', msg: 'Conversion failed. Make sure the PDF has selectable text.' }); setLoading(false); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'dataflow_from_pdf.xlsx'; a.click();
      URL.revokeObjectURL(url);
      setStatus({ type: 'success', msg: 'Converted! Download started.' });
    } catch {
      setStatus({ type: 'error', msg: 'Could not reach server.' });
    }
    setLoading(false);
  };

  return (
    <div>
      <div className="full-panel" style={{ marginBottom: 20 }}>
        <div className="tool-panel-title"><FileText size={16} /> Upload PDF Files</div>

        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 10,
          padding: '12px 14px', borderRadius: 'var(--radius-sm)',
          background: 'var(--orange-pale)', border: '1.5px solid var(--orange-border)',
          marginBottom: 18, fontSize: '0.82rem', color: 'var(--gray-700)'
        }}>
          <Info size={15} style={{ color: 'var(--orange)', flexShrink: 0, marginTop: 1 }} />
          <span>
            Works best with <strong>text-based PDFs</strong> (reports, exported tables). Scanned PDFs (photos of paper)
            need OCR — those are tricky and may have limited accuracy.
          </span>
        </div>

        <DropZone
          accept=".pdf"
          files={files}
          onFiles={setFiles}
          label="Drop PDF files here — each becomes a sheet in the Excel output"
        />
      </div>

      {files.length > 0 && (
        <div className="action-bar">
          <div className={`status-msg ${status?.type || ''}`}>
            {status ? status.msg : `${files.length} PDF${files.length > 1 ? 's' : ''} ready — each will become a separate sheet`}
          </div>
          <button className="btn-primary" onClick={handleConvert} disabled={loading}>
            {loading
              ? <span className="spinner" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} />
              : <Download size={15} />}
            Convert to Excel
          </button>
        </div>
      )}

      {!files.length && (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--gray-300)' }}>
          <FileText size={48} strokeWidth={1} style={{ margin: '0 auto 12px', display: 'block' }} />
          <p style={{ fontSize: '0.9rem' }}>Upload PDFs above to get started</p>
        </div>
      )}
    </div>
  );
}
