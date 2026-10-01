import React, { useState, useEffect } from 'react';
import ReviewSplitPane from './ReviewSplitPane';

export default function PeerReview({ roomId, token }) {
  const [submissions, setSubmissions] = useState([]);
  const [title, setTitle] = useState('');
  const [file, setFile] = useState(null);
  const [url, setUrl] = useState('');
  const [textContent, setTextContent] = useState('');
  const [type, setType] = useState('text');
  const [activeSubmission, setActiveSubmission] = useState(null);

  const fetchSubmissions = async () => {
    try {
      const res = await fetch(`http://localhost:5000/api/rooms/${roomId}/submissions`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setSubmissions(await res.json());
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchSubmissions(); }, [roomId, token]);

  const addSubmission = async (e) => {
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
          body: JSON.stringify({ title, content_url: type === 'text' ? textContent : url, type })
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
      const res = await fetch(`http://localhost:5000/api/rooms/${roomId}/submissions`, fetchOptions);
      if (res.ok) {
        setTitle(''); setUrl(''); setTextContent(''); setFile(null);
        fetchSubmissions();
      }
    } catch (err) { console.error(err); }
  };

  if (activeSubmission) {
    return <ReviewSplitPane roomId={roomId} submission={activeSubmission} token={token} onBack={() => setActiveSubmission(null)} />;
  }

  return (
    <div className="tab-content">
      {/* Submission form */}
      <div style={{
        background: 'var(--bg-raised)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: '1.25rem',
        marginBottom: '1.5rem',
      }}>
        <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          📤 Submit Assignment
        </h4>
        <form onSubmit={addSubmission} style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
            <input
              type="text"
              className="form-input"
              placeholder="Assignment title…"
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
              <option value="text">📝 Text</option>
              <option value="link">🔗 Link</option>
              <option value="pdf">📄 PDF</option>
              <option value="document">📃 Document</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'flex-start' }}>
            {type === 'text' ? (
              <textarea
                className="form-input"
                placeholder="Paste your essay or code here…"
                value={textContent}
                onChange={e => setTextContent(e.target.value)}
                rows={3}
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
              Submit
            </button>
          </div>
        </form>
      </div>

      {/* Submissions list */}
      <h4 style={{ margin: '0 0 0.85rem 0', fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        🔍 Needs Review
      </h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {submissions.length === 0 && (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-tertiary)', fontSize: '0.88rem' }}>
            No submissions yet. Be the first to submit!
          </div>
        )}
        {submissions.map(sub => (
          <div
            key={sub.id}
            style={{
              padding: '1rem 1.25rem',
              background: 'var(--bg-raised)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '1rem',
              transition: 'border-color 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-border)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
          >
            <div>
              <h4 style={{ margin: '0 0 0.3rem 0', fontSize: '0.9rem', fontWeight: 600 }}>
                {sub.title}
              </h4>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>
                by {sub.author} · {new Date(sub.created_at).toLocaleString()}
              </div>
            </div>
            <button
              className="btn btn-primary"
              style={{ width: 'auto', padding: '0.45rem 0.9rem', fontSize: '0.82rem', flexShrink: 0 }}
              onClick={() => setActiveSubmission(sub)}
            >
              {sub.author === 'You' ? 'View Feedback' : '→ Review'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
