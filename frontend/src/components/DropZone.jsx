import { useRef, useState } from 'react';
import { Upload, X, File } from 'lucide-react';

export default function DropZone({ accept, multiple = true, files, onFiles, label }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef();

  const addFiles = (incoming) => {
    const arr = Array.from(incoming);
    onFiles(multiple ? [...files, ...arr] : arr);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  };

  const remove = (i) => onFiles(files.filter((_, idx) => idx !== i));

  return (
    <div>
      <div
        className={`drop-zone ${dragging ? 'drag-over' : ''}`}
        style={{ padding: '28px 20px', textAlign: 'center' }}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current.click()}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 44, height: 44,
            background: 'var(--orange-pale)',
            borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--orange)',
          }}>
            <Upload size={20} />
          </div>
          <div>
            <p style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--black)' }}>
              {label || 'Drop files here or click to browse'}
            </p>
            <p style={{ fontSize: '0.78rem', color: 'var(--gray-500)', marginTop: 3 }}>
              {accept}
            </p>
          </div>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          style={{ display: 'none' }}
          onChange={(e) => addFiles(e.target.files)}
        />
      </div>

      {files.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
          {files.map((f, i) => (
            <div key={i} className="file-chip">
              <File size={14} color="var(--orange)" />
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {f.name}
              </span>
              <span style={{ color: 'var(--gray-500)', fontSize: '0.7rem', flexShrink: 0 }}>
                {(f.size / 1024).toFixed(0)} KB
              </span>
              <button onClick={(e) => { e.stopPropagation(); remove(i); }}>
                <X size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
