import React, { useState, useEffect } from 'react';

const TYPE_ICONS = {
  link:     '🔗',
  text:     '📝',
  pdf:      '📄',
  document: '📃',
};

export default function ResourcesList({ roomId, token }) {
  const [resources, setResources] = useState([]);
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [textContent, setTextContent] = useState('');
  const [file, setFile] = useState(null);
  const [type, setType] = useState('text');

  const fetchResources = async () => {
    try {
      const res = await fetch(`http://localhost:5000/api/rooms/${roomId}/resources`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setResources(await res.json());
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchResources(); }, [roomId, token]);

  const addResource = async (e) => {
    e.preventDefault();
    if (!title) return;
    if (type === 'link' && !url) return;
    if (type === 'text' && !textContent) return;
    if (type !== 'link' && type !== 'text' && !file) return;

    try {
      let fetchOptions = {};
      if (type === 'link' || type === 'text') {
        fetchOptions = {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ title, url: type === 'text' ? textContent : url, type })
        };
      } else {
        const formData = new FormData();
        formData.append('title', title);
        formData.append('type', type);
        formData.append('file', file);
        fetchOptions = {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData
        };
      }

      const res = await fetch(`http://localhost:5000/api/rooms/${roomId}/resources`, fetchOptions);
      if (res.ok) {
        setTitle(''); setUrl(''); setTextContent(''); setFile(null);
        fetchResources();
      }
    } catch (err) { console.error(err); }
  };

  const deleteResource = async (resourceId) => {
    try {
      const res = await fetch(`http://localhost:5000/api/rooms/${roomId}/resources/${resourceId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) fetchResources();
    } catch (err) { console.error(err); }
  };

  return (
    <div className="tab-content">
      {/* Add resource form */}
      <div style={{
        background: 'var(--bg-raised)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: '1.25rem',
        marginBottom: '1.5rem',
      }}>
        <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          📎 Add Resource
        </h4>
        <form onSubmit={addResource} style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
            <input
              type="text"
              className="form-input"
              placeholder="Resource title…"
              value={title}
              onChange={e => setTitle(e.target.value)}
              style={{ flex: '2 1 180px' }}
            />
            <select
              className="form-input"
              value={type}
              onChange={e => setType(e.target.value)}
              style={{ flex: '1 1 130px' }}
            >
              <option value="text">📝 Text Note</option>
              <option value="link">🔗 Web Link</option>
              <option value="pdf">📄 PDF File</option>
              <option value="document">📃 Document</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'flex-start' }}>
            {type === 'text' ? (
              <textarea
                className="form-input"
                placeholder="Paste your notes here…"
                value={textContent}
                onChange={e => setTextContent(e.target.value)}
                rows={2}
                style={{ flex: 1, resize: 'vertical', fontFamily: 'inherit' }}
              />
            ) : type === 'link' ? (
              <input
                type="url"
                className="form-input"
                placeholder="https://…"
                value={url}
                onChange={e => setUrl(e.target.value)}
                style={{ flex: 1 }}
              />
            ) : (
              <input
                type="file"
                className="form-input"
                onChange={e => setFile(e.target.files[0])}
                style={{ flex: 1, padding: '0.4rem 0.75rem' }}
                accept={type === 'pdf' ? '.pdf' : '.doc,.docx,.txt'}
              />
            )}
            <button type="submit" className="btn btn-primary" style={{ width: 'auto', padding: '0.68rem 1.1rem', flexShrink: 0 }}>
              Add
            </button>
          </div>
        </form>
      </div>

      {/* Resources list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {resources.length === 0 && (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-tertiary)', fontSize: '0.88rem' }}>
            No resources yet. Be the first to add one!
          </div>
        )}
        {resources.map(res => (
          <div
            key={res.id}
            style={{
              padding: '1rem 1.25rem',
              background: 'var(--bg-raised)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: '1rem',
              transition: 'border-color 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-border)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                <span style={{ fontSize: '1rem' }}>{TYPE_ICONS[res.type] || '📎'}</span>
                <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {res.type === 'text' ? (
                    res.title
                  ) : (
                    <a
                      href={res.url}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: 'var(--accent-light)', textDecoration: 'none' }}
                    >
                      {res.title} ↗
                    </a>
                  )}
                </h4>
              </div>
              {res.type === 'text' && (
                <div style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '0.65rem 0.85rem',
                  marginBottom: '0.5rem',
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'monospace',
                  fontSize: '0.82rem',
                  lineHeight: 1.5,
                  color: 'var(--text-secondary)',
                  maxHeight: '100px',
                  overflow: 'hidden',
                }}>
                  {res.url}
                </div>
              )}
              <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>
                by {res.uploader_name}
                <span style={{ marginLeft: '0.5rem', padding: '0.1rem 0.4rem', background: 'var(--bg-hover)', borderRadius: '99px' }}>
                  {res.type}
                </span>
              </div>
            </div>
            <button
              className="btn btn-danger btn-xs"
              style={{ flexShrink: 0 }}
              onClick={() => deleteResource(res.id)}
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
