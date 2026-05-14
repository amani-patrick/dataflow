import { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Settings, Table, Download, RefreshCw, Trash2, Plus, 
  FileText, MessageSquare, Play, History, ChevronRight, 
  LayoutDashboard, Info, AlertCircle, CheckCircle2, 
  Search, Wand2, ArrowRight, BarChart3, Database, Filter
} from 'lucide-react';
import DropZone from '../components/DropZone.jsx';
import * as XLSX from 'xlsx';

const API = import.meta.env.VITE_API_URL || '';

export default function ExcelTool() {
  const [files, setFiles] = useState([]);
  const [preview, setPreview] = useState(null);
  const [stats, setStats] = useState(null);
  const [pipeline, setPipeline] = useState([]);
  const [command, setCommand] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [activeTab, setActiveTab] = useState('pipeline'); // 'pipeline' | 'insights' | 'preview'

  const totalRows = stats?.reduce((a, s) => a + s.rowCount, 0) || 0;
  const totalCols = stats?.[0] ? Object.keys(stats[0].columns).length : 0;

  // Natural Language Parser (The "Jarvis" Brain)
  const processCommand = (cmd) => {
    const c = cmd.toLowerCase();
    let newStep = null;

    if (c.includes('group by') || c.includes('summarize')) {
      const match = c.match(/group by ([\w\s,]+)/);
      const cols = match ? match[1].split(',').map(s => s.trim()) : [];
      newStep = { 
        action: 'group_by', 
        params: { columns: cols, aggregations: [{ column: 'Amount', method: 'sum' }] },
        label: `Group by ${cols.join(', ')}`
      };
    } else if (c.includes('remove column') || c.includes('drop')) {
      const match = c.match(/(?:remove|drop) ([\w\s,]+)/);
      const cols = match ? match[1].split(',').map(s => s.trim()) : [];
      newStep = { action: 'drop_columns', params: { columns: cols }, label: `Drop columns: ${cols.join(', ')}` };
    } else if (c.includes('remove duplicates') || c.includes('dedup')) {
      newStep = { action: 'drop_duplicates', params: {}, label: 'Remove duplicates' };
    } else if (c.includes('fill') && c.includes('with')) {
      const val = c.match(/with (['"]?)(.*?)\1/)?.[2] || '0';
      newStep = { action: 'fill_missing', params: { value: val }, label: `Fill empty with "${val}"` };
    } else if (c.includes('trim') || c.includes('clean spaces')) {
      newStep = { action: 'trim', params: {}, label: 'Trim whitespace' };
    }

    if (newStep) {
      setPipeline([...pipeline, newStep]);
      setCommand('');
      setStatus({ type: 'success', msg: `Jarvis added step: ${newStep.label}` });
    } else {
      setStatus({ type: 'error', msg: "I didn't quite catch that. Try 'group by District' or 'remove duplicates'." });
    }
  };

  const handlePreview = async () => {
    if (!files.length) return;
    setLoading(true);
    try {
      const results = await Promise.all(files.map(async (file) => {
        const data = await file.arrayBuffer();
        const wb = XLSX.read(data, { type: 'array' });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(sheet, { defval: '' });
        return { filename: file.name, rows: json.slice(0, 10), headers: Object.keys(json[0] || {}) };
      }));
      setPreview(results);
      
      // Fetch stats from backend
      const fd = new FormData();
      files.forEach(f => fd.append('files', f));
      const res = await fetch(`${API}/api/excel/stats`, { method: 'POST', body: fd });
      const data = await res.json();
      if (data.success) setStats(data.stats);
    } catch (err) {
      console.error(err);
      setStatus({ type: 'error', msg: 'Failed to analyze files.' });
    }
    setLoading(false);
  };

  const handleRun = async () => {
    setLoading(true);
    try {
      const fd = new FormData();
      files.forEach(f => fd.append('files', f));
      fd.append('pipeline', JSON.stringify(pipeline));
      
      const res = await fetch(`${API}/api/excel/process`, { method: 'POST', body: fd });
      if (!res.ok) throw new Error('Processing failed');
      
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'dataflow_jarvis_result.xlsx'; a.click();
      URL.revokeObjectURL(url);
      setStatus({ type: 'success', msg: 'Optimization complete. File downloaded!' });
    } catch (err) {
      setStatus({ type: 'error', msg: err.message });
    }
    setLoading(false);
  };

  return (
    <div className="jarvis-container">
      {/* Top Console */}
      <div className="glass-panel main-console">
        <div className="console-header">
          <div className="brand">
            <div className="jarvis-orb"></div>
            <span>DATAFLOW <span className="highlight">JARVIS</span></span>
          </div>
          <div className="console-stats">
            <div className="stat-item"><Database size={14} /> {files.length} Files</div>
            <div className="stat-item"><Table size={14} /> {totalRows.toLocaleString()} Rows</div>
            <div className="stat-item"><LayoutDashboard size={14} /> {totalCols} Fields</div>
          </div>
        </div>

        <DropZone
          accept=".xlsx,.xls,.csv"
          files={files}
          onFiles={setFiles}
          label="Initialize files into the DataFlow workspace"
        />

        {files.length > 0 && !preview && (
          <button className="btn-jarvis-start" onClick={handlePreview}>
            <Wand2 size={18} /> Analyze Workspace
          </button>
        )}
      </div>

      {preview && (
        <div className="workspace-layout">
          {/* Main Area */}
          <div className="workspace-main">
            {/* Jarvis Command Bar */}
            <div className="command-bar-wrap">
              <MessageSquare size={20} className="command-icon" />
              <input 
                type="text" 
                placeholder="Talk to Jarvis... 'group by category', 'remove duplicates', 'trim all columns'" 
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && processCommand(command)}
              />
              <button onClick={() => processCommand(command)}><ArrowRight size={18} /></button>
            </div>

            {/* Tab Navigation */}
            <div className="tab-nav">
              <button className={activeTab === 'pipeline' ? 'active' : ''} onClick={() => setActiveTab('pipeline')}><History size={16} /> Pipeline</button>
              <button className={activeTab === 'insights' ? 'active' : ''} onClick={() => setActiveTab('insights')}><BarChart3 size={16} /> Insights</button>
              <button className={activeTab === 'preview' ? 'active' : ''} onClick={() => setActiveTab('preview')}><Search size={16} /> Data View</button>
            </div>

            <div className="tab-content">
              {activeTab === 'pipeline' && (
                <div className="pipeline-view">
                  {pipeline.length === 0 ? (
                    <div className="empty-pipeline">
                      <Sparkles size={48} color="var(--orange-pale)" />
                      <p>Your pipeline is empty. Give Jarvis a command to begin.</p>
                    </div>
                  ) : (
                    <div className="pipeline-list">
                      {pipeline.map((step, i) => (
                        <div key={i} className="pipeline-step">
                          <div className="step-index">{i + 1}</div>
                          <div className="step-label">{step.label}</div>
                          <button className="step-remove" onClick={() => setPipeline(pipeline.filter((_, idx) => idx !== i))}>✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'insights' && stats && (
                <div className="insights-grid">
                  {Object.entries(stats[0].columns).map(([name, info]) => (
                    <div key={name} className="insight-card">
                      <div className="insight-title">{name}</div>
                      <div className="insight-body">
                        <div className="insight-row"><span>Type:</span> <strong>{info.type}</strong></div>
                        <div className="insight-row"><span>Unique:</span> <strong>{info.uniqueCount}</strong></div>
                        <div className="insight-row"><span>Missing:</span> <strong className={info.nullCount > 0 ? 'alert' : ''}>{info.nullCount}</strong></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'preview' && (
                <div className="data-view">
                  {preview.map((f, fi) => (
                    <div key={fi} className="file-preview-block">
                      <div className="file-title"><FileText size={14} /> {f.filename}</div>
                      <div className="table-mini-wrap">
                        <table>
                          <thead>
                            <tr>{f.headers.map(h => <th key={h}>{h}</th>)}</tr>
                          </thead>
                          <tbody>
                            {f.rows.map((row, ri) => (
                              <tr key={ri}>
                                {f.headers.map(h => <td key={h}>{String(row[h])}</td>)}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Sidebar: Execution */}
          <div className="workspace-sidebar">
            <div className="sidebar-header">Finalize Workspace</div>
            <div className="sidebar-stats">
              <div className="s-stat"><span>Steps</span> <strong>{pipeline.length}</strong></div>
              <div className="s-stat"><span>Status</span> <strong style={{ color: 'var(--green)' }}>Healthy</strong></div>
            </div>
            
            <button className="btn-run-all" onClick={handleRun} disabled={loading || pipeline.length === 0}>
              {loading ? <span className="spinner-white" /> : <Play size={18} />}
              Execute Pipeline
            </button>

            {status && (
              <div className={`jarvis-status ${status.type}`}>
                {status.type === 'error' ? <AlertCircle size={14} /> : <CheckCircle2 size={14} />}
                {status.msg}
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        .jarvis-container { max-width: 1200px; margin: 0 auto; animation: slideUp 0.5s ease-out; }
        .main-console { padding: 24px; margin-bottom: 24px; border: 1px solid rgba(255,255,255,0.1); }
        .console-header { display: flex; justify-content: space-between; align-items: center; marginBottom: 20px; }
        .brand { display: flex; align-items: center; gap: 12px; font-family: Syne; font-weight: 800; font-size: 1.2rem; letter-spacing: 0.1em; }
        .highlight { color: var(--orange); }
        .jarvis-orb { width: 16px; height: 16px; background: radial-gradient(circle, var(--orange), transparent); border-radius: 50%; box-shadow: 0 0 15px var(--orange); animation: pulse 2s infinite; }
        .console-stats { display: flex; gap: 16px; font-size: 0.75rem; color: var(--gray-500); }
        .stat-item { display: flex; align-items: center; gap: 6px; }
        .btn-jarvis-start { width: 100%; margin-top: 20px; padding: 14px; background: var(--black); color: white; border: none; border-radius: 12px; font-family: Syne; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; transition: all 0.2s; }
        .btn-jarvis-start:hover { background: #333; transform: scale(1.01); }
        
        .workspace-layout { display: flex; gap: 24px; align-items: flex-start; }
        .workspace-main { flex: 1; }
        .command-bar-wrap { background: white; border: 2px solid var(--gray-100); border-radius: 16px; padding: 12px 20px; display: flex; align-items: center; gap: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.05); margin-bottom: 24px; }
        .command-bar-wrap input { flex: 1; border: none; outline: none; font-size: 1rem; color: var(--black); }
        .command-bar-wrap button { background: var(--orange); color: white; border: none; width: 32px; height: 32px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; }
        
        .tab-nav { display: flex; gap: 12px; margin-bottom: 20px; border-bottom: 1px solid var(--gray-100); padding-bottom: 8px; }
        .tab-nav button { background: transparent; border: none; padding: 8px 16px; font-weight: 600; font-size: 0.85rem; color: var(--gray-500); cursor: pointer; display: flex; align-items: center; gap: 8px; position: relative; }
        .tab-nav button.active { color: var(--orange); }
        .tab-nav button.active:after { content: ''; position: absolute; bottom: -9px; left: 0; width: 100%; height: 2px; background: var(--orange); }
        
        .tab-content { background: white; border: 1px solid var(--gray-200); border-radius: 20px; min-height: 400px; padding: 24px; }
        .pipeline-list { display: flex; flex-direction: column; gap: 12px; }
        .pipeline-step { background: var(--gray-100); padding: 14px 20px; border-radius: 12px; display: flex; align-items: center; gap: 16px; animation: slideIn 0.3s ease-out; }
        .step-index { background: var(--white); width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; border-radius: 50%; font-size: 0.7rem; font-weight: 800; color: var(--orange); }
        .step-label { flex: 1; font-weight: 600; font-size: 0.9rem; }
        .step-remove { background: transparent; border: none; color: var(--gray-400); cursor: pointer; }
        
        .insights-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; }
        .insight-card { border: 1px solid var(--gray-100); border-radius: 12px; padding: 16px; }
        .insight-title { font-weight: 700; font-size: 0.85rem; margin-bottom: 12px; border-bottom: 1px solid var(--gray-50); padding-bottom: 8px; overflow: hidden; text-overflow: ellipsis; }
        .insight-row { display: flex; justify-content: space-between; font-size: 0.75rem; margin-bottom: 6px; }
        .insight-row strong.alert { color: var(--orange); }
        
        .data-view { display: flex; flex-direction: column; gap: 32px; }
        .file-preview-block { border-bottom: 1px solid var(--gray-100); padding-bottom: 24px; }
        .file-title { font-family: Syne; font-weight: 800; font-size: 0.85rem; margin-bottom: 12px; color: var(--gray-600); }
        .table-mini-wrap { overflow-x: auto; font-size: 0.75rem; }
        .table-mini-wrap table { width: 100%; border-collapse: collapse; }
        .table-mini-wrap th { text-align: left; background: var(--gray-50); padding: 8px; border: 1px solid var(--gray-100); }
        .table-mini-wrap td { padding: 8px; border: 1px solid var(--gray-100); }

        .workspace-sidebar { width: 280px; background: var(--gray-100); border-radius: 20px; padding: 24px; position: sticky; top: 24px; }
        .sidebar-header { font-family: Syne; font-weight: 700; font-size: 0.9rem; margin-bottom: 20px; }
        .sidebar-stats { background: white; border-radius: 12px; padding: 16px; margin-bottom: 24px; }
        .s-stat { display: flex; justify-content: space-between; font-size: 0.8rem; margin-bottom: 10px; }
        .btn-run-all { width: 100%; padding: 14px; background: var(--orange); color: white; border: none; border-radius: 12px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; box-shadow: 0 10px 20px rgba(232, 105, 42, 0.2); }
        
        .jarvis-status { margin-top: 20px; padding: 12px; border-radius: 12px; font-size: 0.75rem; display: flex; align-items: center; gap: 8px; }
        .jarvis-status.success { background: #f0fdf4; color: #166534; }
        .jarvis-status.error { background: #fef2f2; color: #991b1b; }

        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideIn { from { opacity: 0; transform: translateX(-10px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes pulse { 0% { opacity: 0.6; transform: scale(1); } 50% { opacity: 1; transform: scale(1.2); } 100% { opacity: 0.6; transform: scale(1); } }
      `}</style>
    </div>
  );
}
