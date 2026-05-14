import { useState } from 'react';
import { Settings, Table, Download, RefreshCw, Trash2, Plus } from 'lucide-react';
import DropZone from '../components/DropZone.jsx';

const API = import.meta.env.VITE_API_URL || '';

export default function ExcelTool() {
  const [files, setFiles] = useState([]);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);

  // Options
  const [fillMissing, setFillMissing] = useState('');
  const [sortBy, setSortBy] = useState('');
  const [sortDir, setSortDir] = useState('asc');
  const [removeDuplicates, setRemoveDuplicates] = useState(false);
  const [sumFields, setSumFields] = useState([]);
  const [removeColumns, setRemoveColumns] = useState([]);

  const allHeaders = preview
    ? [...new Set(preview.files.flatMap((f) => f.sheets.flatMap((s) => s.headers)))]
    : [];

  const toggleArr = (arr, setArr, val) =>
    setArr(arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val]);

  const handlePreview = async () => {
    if (!files.length) return;
    setLoading(true);
    setStatus(null);
    try {
      const fd = new FormData();
      files.forEach((f) => fd.append('files', f));
      const res = await fetch(`${API}/api/excel/preview`, { method: 'POST', body: fd });
      const data = await res.json();
      if (data.success) setPreview(data);
      else setStatus({ type: 'error', msg: data.error });
    } catch {
      setStatus({ type: 'error', msg: 'Could not reach server.' });
    }
    setLoading(false);
  };

  const handleProcess = async () => {
    if (!files.length) return;
    setLoading(true);
    setStatus(null);
    try {
      const fd = new FormData();
      files.forEach((f) => fd.append('files', f));
      fd.append('options', JSON.stringify({ fillMissing, sortBy, sortDir, removeDuplicates, sumFields, removeColumns }));
      const res = await fetch(`${API}/api/excel/process`, { method: 'POST', body: fd });
      if (!res.ok) { setStatus({ type: 'error', msg: 'Processing failed.' }); setLoading(false); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'dataflow_merged.xlsx'; a.click();
      URL.revokeObjectURL(url);
      setStatus({ type: 'success', msg: 'File ready — download started!' });
    } catch {
      setStatus({ type: 'error', msg: 'Processing failed.' });
    }
    setLoading(false);
  };

  const reset = () => { setFiles([]); setPreview(null); setStatus(null); setSumFields([]); setRemoveColumns([]); setSortBy(''); };

  return (
    <div>
      {/* Drop zone */}
      <div className="full-panel" style={{ marginBottom: 20 }}>
        <div className="tool-panel-title"><Table size={16} /> Upload Excel Files</div>
        <DropZone
          accept=".xlsx,.xls,.csv"
          files={files}
          onFiles={setFiles}
          label="Drop .xlsx, .xls or .csv files here"
        />
        {files.length > 0 && (
          <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
            <button className="btn-ghost" onClick={handlePreview} disabled={loading}>
              {loading ? <span className="spinner" /> : <RefreshCw size={14} />}
              Preview Data
            </button>
            <button className="btn-ghost" onClick={reset} style={{ marginLeft: 'auto' }}>
              <Trash2 size={14} /> Clear All
            </button>
          </div>
        )}
      </div>

      {/* Preview table */}
      {preview && (
        <div className="full-panel" style={{ marginBottom: 20 }}>
          <div className="tool-panel-title"><Table size={16} /> Preview</div>
          {preview.files.map((file, fi) =>
            file.sheets.map((sheet, si) => (
              <div key={`${fi}-${si}`} style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span className="tag tag-orange">{file.filename}</span>
                  <span className="tag tag-gray">{sheet.name}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>
                    {sheet.totalRows} rows · {sheet.headers.length} columns
                  </span>
                </div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>{sheet.headers.map((h) => <th key={h}>{h}</th>)}</tr>
                    </thead>
                    <tbody>
                      {sheet.rows.slice(0, 8).map((row, ri) => (
                        <tr key={ri}>
                          {sheet.headers.map((h) => (
                            <td key={h} title={String(row[h])}>{row[h] === '' ? <span style={{ color: 'var(--gray-300)' }}>—</span> : String(row[h])}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Options */}
      {files.length > 0 && (
        <div className="tool-grid">
          <div className="tool-panel">
            <div className="tool-panel-title"><Settings size={16} /> Clean &amp; Fill</div>

            <div className="field-row">
              <label className="field-label">Fill empty cells with</label>
              <input className="input-field" value={fillMissing} onChange={(e) => setFillMissing(e.target.value)} placeholder='e.g. "N/A", "0", or leave blank' />
            </div>

            <div className="check-row">
              <input type="checkbox" id="dedup" checked={removeDuplicates} onChange={(e) => setRemoveDuplicates(e.target.checked)} />
              <label htmlFor="dedup">Remove duplicate rows</label>
            </div>

            {allHeaders.length > 0 && (
              <div className="field-row" style={{ marginTop: 8 }}>
                <label className="field-label">Columns to remove</label>
                <div className="col-tags">
                  {allHeaders.map((h) => (
                    <span key={h} className={`col-tag ${removeColumns.includes(h) ? 'selected' : ''}`} onClick={() => toggleArr(removeColumns, setRemoveColumns, h)}>
                      {removeColumns.includes(h) ? '✕ ' : ''}{h}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="tool-panel">
            <div className="tool-panel-title"><Settings size={16} /> Sort &amp; Sum</div>

            {allHeaders.length > 0 && (
              <>
                <div className="field-row">
                  <label className="field-label">Sort by column</label>
                  <select className="input-field" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                    <option value="">— No sort —</option>
                    {allHeaders.map((h) => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>

                {sortBy && (
                  <div className="field-row">
                    <label className="field-label">Direction</label>
                    <select className="input-field" value={sortDir} onChange={(e) => setSortDir(e.target.value)}>
                      <option value="asc">Ascending (A → Z)</option>
                      <option value="desc">Descending (Z → A)</option>
                    </select>
                  </div>
                )}

                <div className="field-row">
                  <label className="field-label">Add TOTAL row for columns</label>
                  <div className="col-tags">
                    {allHeaders.map((h) => (
                      <span key={h} className={`col-tag ${sumFields.includes(h) ? 'selected' : ''}`} onClick={() => toggleArr(sumFields, setSumFields, h)}>
                        {sumFields.includes(h) ? '∑ ' : <Plus size={10} style={{ display: 'inline', marginRight: 2 }} />}{h}
                      </span>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Action bar */}
      {files.length > 0 && (
        <div className="action-bar">
          <div className={`status-msg ${status?.type || ''}`}>
            {status ? status.msg : `${files.length} file${files.length > 1 ? 's' : ''} ready to process`}
          </div>
          <button className="btn-primary" onClick={handleProcess} disabled={loading}>
            {loading ? <span className="spinner" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} /> : <Download size={15} />}
            Merge &amp; Download
          </button>
        </div>
      )}
    </div>
  );
}
