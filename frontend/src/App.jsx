import { useState } from 'react';
import { FileSpreadsheet, FileText, Archive, Zap } from 'lucide-react';
import ExcelTool from './pages/ExcelTool.jsx';
import PdfTool from './pages/PdfTool.jsx';
import CompressTool from './pages/CompressTool.jsx';
import './App.css';

const TABS = [
  { id: 'excel', label: 'Excel Tools', icon: FileSpreadsheet, desc: 'Merge · Clean · Sort · Sum' },
  { id: 'pdf', label: 'PDF → Excel', icon: FileText, desc: 'Extract tables from PDFs' },
  { id: 'compress', label: 'Compress', icon: Archive, desc: 'Shrink files for submission' },
];

export default function App() {
  const [tab, setTab] = useState('excel');

  return (
    <div className="app-root">
      <header className="app-header">
        <div className="header-inner">
          <div className="logo">
            <img 
              src="/Data_Flow_logo.png" 
              alt="DataFlow Logo" 
              style={{ height: '32px', width: 'auto', marginRight: '12px' }} 
            />
            <span className="logo-text">DataFlow</span>
            <span className="logo-badge">v1</span>
          </div>
          <nav className="tab-nav">
            {TABS.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  className={`tab-btn ${tab === t.id ? 'active' : ''}`}
                  onClick={() => setTab(t.id)}
                >
                  <Icon size={15} />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="app-main">
        <div className="page-header">
          {TABS.filter((t) => t.id === tab).map((t) => {
            const Icon = t.icon;
            return (
              <div key={t.id} className="animate-fade-up">
                <div className="page-title-row">
                  <div className="page-icon">
                    <Icon size={20} strokeWidth={2} />
                  </div>
                  <div>
                    <h1 className="page-title">{t.label}</h1>
                    <p className="page-desc">{t.desc}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="page-content animate-fade-up" style={{ animationDelay: '0.05s' }}>
          {tab === 'excel' && <ExcelTool />}
          {tab === 'pdf' && <PdfTool />}
          {tab === 'compress' && <CompressTool />}
        </div>
      </main>

      <footer className="app-footer">
        <span>DataFlow — Built with ♥ for people who deserve better than copy-paste</span>
      </footer>
    </div>
  );
}
