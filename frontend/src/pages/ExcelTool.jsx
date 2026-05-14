import { useState } from 'react';
import { Terminal, Play, Save, Trash2, Wand2, Zap, Layout, FileSpreadsheet, Shield, Download, Info, AlertCircle } from 'lucide-react';
import DropZone from '../components/DropZone.jsx';

const API = import.meta.env.VITE_API_URL || '';

export default function ExcelTool() {
  const [files, setFiles] = useState([]);
  const [command, setCommand] = useState('');
  const [pipeline, setPipeline] = useState([]);
  const [executing, setExecuting] = useState(false);
  const [insights, setInsights] = useState([]);
  const [vault, setVault] = useState([]);

  const analyzeFiles = async (files) => {
    if (!files.length) return;
    try {
      const fd = new FormData();
      files.forEach(f => fd.append('files', f));
      const res = await fetch(`${API}/api/excel/stats`, { method: 'POST', body: fd });
      const data = await res.json();
      if (data.success) {
        setInsights(Object.entries(data.stats[0].columns).map(([k, v]) => ({ column: k, ...v })));
      }
    } catch (err) { console.error(err); }
  };

  const addStep = () => {
    if (!command.trim()) return;
    // Simple NL parsing mock - in a real app this would call an LLM endpoint
    let type = 'clean';
    let params = { action: command };
    
    if (command.toLowerCase().includes('group')) type = 'group_by';
    else if (command.toLowerCase().includes('filter')) type = 'filter';
    else if (command.toLowerCase().includes('sort')) type = 'sort';

    setPipeline([...pipeline, { type, params, label: command }]);
    setCommand('');
  };

  const removeStep = (index) => setPipeline(pipeline.filter((_, i) => i !== index));

  const handleExecute = async () => {
    if (!files.length) return;
    setExecuting(true);
    try {
      const fd = new FormData();
      files.forEach(f => fd.append('files', f));
      fd.append('pipeline', JSON.stringify(pipeline));

      const res = await fetch(`${API}/api/excel/process`, { method: 'POST', body: fd });
      const data = await res.json();
      
      if (data.success) {
        setVault([{ url: data.downloadUrl, name: data.fileName, time: new Date().toLocaleTimeString() }, ...vault]);
        setCommand('');
      }
    } catch (err) { console.error(err); }
    setExecuting(false);
  };

  return (
    <div className="jarvis-container">
      <div className="jarvis-grid">
        <div className="jarvis-main">
          <div className="full-panel" style={{ border: '1px solid var(--gray-200)', minHeight: 500, display: 'flex', flexDirection: 'column' }}>
            <div className="jarvis-header">
              <div className="orb-small"><Wand2 size={16} color="white" /></div>
              <div style={{ fontWeight: 800, fontSize: '0.9rem', letterSpacing: '0.05em' }}>DATAFLOW JARVIS CONSOLE</div>
              <div className="status-dot"></div>
            </div>

            <div className="command-wrapper">
              <Terminal size={18} className="term-icon" />
              <input 
                type="text" 
                className="jarvis-input"
                placeholder="What should I do with this data?"
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addStep()}
              />
              <button className="btn-add-step" onClick={addStep}>Add Step</button>
            </div>

            <div className="pipeline-workspace">
              <div className="pipeline-label">ACTIVE OPERATIONS</div>
              <div className="pipeline-list">
                {pipeline.length === 0 ? (
                  <div className="empty-pipeline">
                    <Zap size={32} strokeWidth={1} style={{ marginBottom: 12, opacity: 0.3 }} />
                    <p>No operations queued. Use the command bar above to start.</p>
                  </div>
                ) : (
                  pipeline.map((step, i) => (
                    <div key={i} className="pipeline-step-card">
                      <div className="step-num">{i + 1}</div>
                      <div className="step-body">
                        <div className="step-type">{step.type.replace('_', ' ')}</div>
                        <div className="step-details">{step.label}</div>
                      </div>
                      <button className="step-remove" onClick={() => removeStep(i)}>×</button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div style={{ marginTop: 'auto', paddingTop: 20 }}>
              <DropZone
                accept=".xlsx,.xls,.csv"
                files={files}
                onFiles={(newFiles) => { setFiles(newFiles); analyzeFiles(newFiles); }}
                label="Initialize core datasets"
              />
              
              {pipeline.length > 0 && (
                <button className="btn-execute" onClick={handleExecute} disabled={executing || !files.length}>
                  {executing ? <span className="spinner-white" /> : <Play size={16} fill="white" />}
                  {executing ? 'Executing Pipeline...' : 'Execute Operations'}
                </button>
              )}
            </div>
          </div>

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
                    <a href={`${API}${item.url}`} className="v-btn" target="_blank" rel="noreferrer">
                      <Download size={14} /> Download
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="jarvis-sidebar">
          <div className="panel-label" style={{ marginBottom: 16 }}>FIELD ANALYTICS</div>
          <div className="insight-list">
            {insights.length === 0 ? (
              <div style={{ color: 'var(--gray-400)', fontSize: '0.8rem', textAlign: 'center', padding: '40px 0' }}>
                Upload files to see field insights
              </div>
            ) : (
              insights.map((insight, i) => (
                <div key={i} className="insight-card">
                  <div className="insight-field">{insight.column}</div>
                  <div className="insight-meta">
                    <div className="tag">{insight.type}</div>
                    <span>{insight.unique} unique</span>
                  </div>
                  {insight.missing > 0 && (
                    <div className="insight-alert">
                      <AlertCircle size={12} /> {insight.missing} missing
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <style>{`
        .jarvis-container { max-width: 1200px; margin: 0 auto; animation: fadeIn 0.5s ease-out; }
        .jarvis-grid { display: grid; grid-template-columns: 1fr 300px; gap: 24px; }
        .jarvis-header { display: flex; align-items: center; gap: 16px; margin-bottom: 24px; border-bottom: 1px solid var(--gray-100); padding-bottom: 16px; }
        .orb-small { width: 32px; height: 32px; background: var(--black); border-radius: 10px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
        .status-dot { width: 8px; height: 8px; background: #22c55e; border-radius: 50%; box-shadow: 0 0 10px #22c55e; margin-left: auto; }
        .command-wrapper { display: flex; gap: 12px; background: var(--gray-100); padding: 8px 12px; border-radius: 16px; align-items: center; border: 1px solid transparent; transition: all 0.2s; margin-bottom: 24px; }
        .command-wrapper:focus-within { background: white; border-color: var(--orange); box-shadow: 0 4px 20px rgba(0,0,0,0.05); }
        .term-icon { color: var(--gray-400); }
        .jarvis-input { flex: 1; background: none; border: none; outline: none; font-family: 'Syne'; font-weight: 600; font-size: 1rem; color: var(--black); }
        .btn-add-step { background: var(--black); color: white; border: none; padding: 8px 16px; border-radius: 10px; font-weight: 700; cursor: pointer; font-size: 0.8rem; }
        .pipeline-workspace { flex: 1; background: #fafafa; border-radius: 20px; padding: 20px; border: 1px dashed var(--gray-300); }
        .pipeline-label { font-size: 0.7rem; font-weight: 800; color: var(--gray-400); letter-spacing: 0.1em; margin-bottom: 16px; }
        .pipeline-list { display: flex; flex-direction: column; gap: 10px; }
        .empty-pipeline { text-align: center; color: var(--gray-400); font-size: 0.8rem; padding: 40px 20px; }
        .pipeline-step-card { background: white; border: 1px solid var(--gray-200); padding: 12px 16px; border-radius: 14px; display: flex; align-items: center; gap: 16px; box-shadow: var(--shadow-sm); animation: slideRight 0.3s ease-out; }
        .step-num { width: 24px; height: 24px; background: var(--gray-100); border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 800; color: var(--gray-500); }
        .step-type { font-weight: 800; font-size: 0.8rem; text-transform: uppercase; color: var(--black); }
        .step-details { font-size: 0.75rem; color: var(--gray-500); }
        .step-remove { margin-left: auto; background: none; border: none; color: var(--gray-300); font-size: 1.2rem; cursor: pointer; transition: color 0.2s; }
        .step-remove:hover { color: #ef4444; }
        .btn-execute { width: 100%; margin-top: 20px; background: var(--black); color: white; border: none; padding: 16px; border-radius: 16px; font-weight: 700; font-family: 'Syne'; display: flex; align-items: center; justify-content: center; gap: 12px; cursor: pointer; transition: all 0.2s; }
        .btn-execute:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(0,0,0,0.2); }
        .btn-execute:disabled { opacity: 0.3; cursor: not-allowed; }
        .insight-card { background: white; border: 1px solid var(--gray-200); border-radius: 16px; padding: 16px; margin-bottom: 12px; }
        .insight-field { font-weight: 800; font-size: 0.9rem; margin-bottom: 8px; color: var(--black); }
        .insight-meta { display: flex; align-items: center; gap: 8px; font-size: 0.75rem; color: var(--gray-500); }
        .insight-alert { margin-top: 10px; display: flex; align-items: center; gap: 6px; font-size: 0.75rem; color: #b91c1c; background: #fee2e2; padding: 6px 10px; border-radius: 8px; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideRight { from { opacity: 0; transform: translateX(-10px); } to { opacity: 1; transform: translateX(0); } }
        .spinner-white { width: 18px; height: 18px; border: 3px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
