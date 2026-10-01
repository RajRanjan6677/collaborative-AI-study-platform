import React, { useState, useEffect } from 'react';

export default function ReviewSplitPane({ roomId, submission, token, onBack }) {
  const [reviews, setReviews] = useState([]);
  const [rating, setRating] = useState(5);
  const [comments, setComments] = useState('');

  const fetchReviews = async () => {
    try {
      const res = await fetch(`http://localhost:5000/api/rooms/${roomId}/submissions/${submission.id}/reviews`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setReviews(await res.json());
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    fetchReviews();
  }, [roomId, submission.id, token]);

  const submitReview = async (e) => {
    e.preventDefault();
    if (!comments.trim()) return;

    try {
      const res = await fetch(`http://localhost:5000/api/rooms/${roomId}/submissions/${submission.id}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ rating, comments })
      });
      
      if (res.ok) {
        setRating(5);
        setComments('');
        fetchReviews();
      } else {
        const data = await res.json();
        alert(data.message);
      }
    } catch (err) { console.error(err); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ padding: '1rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center' }}>
        <button className="btn btn-primary" style={{width: 'auto', marginRight: '1rem'}} onClick={onBack}>← Back</button>
        <h3 style={{margin: 0}}>Reviewing: {submission.title} (by {submission.author})</h3>
      </div>

      {/* Split Pane */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        
        {/* Left Pane: Content */}
        <div style={{ flex: 1.5, borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', padding: '1rem', backgroundColor: 'var(--bg-default)' }}>
          {submission.type === 'text' ? (
            <div style={{ flex: 1, backgroundColor: '#fff', color: '#000', padding: '1.5rem', borderRadius: '8px', overflowY: 'auto', whiteSpace: 'pre-wrap', fontFamily: 'monospace', border: '1px solid var(--border-color)' }}>
              {submission.content_url}
            </div>
          ) : submission.type === 'pdf' ? (
            <iframe 
              src={submission.content_url} 
              style={{ width: '100%', height: '100%', border: 'none', borderRadius: '8px', backgroundColor: '#fff' }}
              title="Submission PDF"
            />
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', backgroundColor: 'var(--bg-panel)', borderRadius: '8px' }}>
              <p style={{marginBottom: '1rem'}}>This submission is an external file or link.</p>
              <a href={submission.content_url} target="_blank" rel="noreferrer" className="btn btn-primary" style={{width: 'auto', textDecoration: 'none'}}>
                Open in new tab
              </a>
            </div>
          )}
        </div>

        {/* Right Pane: Reviews */}
        <div style={{ flex: 1, padding: '1rem', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          <h4>Peer Feedback</h4>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
            {reviews.length === 0 && <div style={{color: 'var(--text-muted)', fontSize: '0.9rem'}}>No reviews yet. Be the first!</div>}
            {reviews.map(rev => (
              <div key={rev.id} style={{ backgroundColor: 'var(--bg-panel)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <strong>{rev.reviewer}</strong>
                  <span style={{ color: 'gold' }}>{'★'.repeat(rev.rating)}{'☆'.repeat(5 - rev.rating)}</span>
                </div>
                <p style={{ margin: 0, fontSize: '0.9rem' }}>{rev.comments}</p>
              </div>
            ))}
          </div>

          {/* Submit Review Form (Hidden if user is the author) */}
          {submission.author !== 'You' ? (
            <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
              <h4 style={{marginTop: 0}}>Leave a Review</h4>
              <form onSubmit={submitReview} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <label>Rating:</label>
                  <select className="form-input" value={rating} onChange={e => setRating(parseInt(e.target.value))} style={{width: 'auto'}}>
                    {[5,4,3,2,1].map(r => <option key={r} value={r}>{r} Stars</option>)}
                  </select>
                </div>
                <textarea 
                  className="form-input" 
                  rows="4" 
                  placeholder="Constructive feedback..."
                  value={comments}
                  onChange={e => setComments(e.target.value)}
                />
                <button type="submit" className="btn btn-primary">Submit Review</button>
              </form>
            </div>
          ) : (
             <div style={{ marginTop: 'auto', borderTop: '1px solid var(--border-color)', paddingTop: '1rem', color: 'var(--text-muted)' }}>
               You cannot review your own submission.
             </div>
          )}
        </div>
      </div>
    </div>
  );
}
