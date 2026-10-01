import React, { useState } from 'react';

export default function Flashcards({ roomId, token }) {
  const [flashcards, setFlashcards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [customInstructions, setCustomInstructions] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const generateFlashcards = async () => {
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:5000/api/rooms/${roomId}/ai/flashcards`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ topicContext: customInstructions.trim() !== '' ? customInstructions : undefined })
      });
      if (res.ok) {
        const data = await res.json();
        setFlashcards(data.flashcards);
        setCurrentIndex(0);
        setIsFlipped(false);
      } else {
        const errData = await res.json();
        alert(errData.message || 'Error generating flashcards');
      }
    } catch (err) {
      console.error(err);
      alert('Network error');
    } finally {
      setLoading(false);
    }
  };

  const nextCard = () => {
    setIsFlipped(false);
    setTimeout(() => setCurrentIndex(prev => Math.min(prev + 1, flashcards.length - 1)), 200);
  };

  const prevCard = () => {
    setIsFlipped(false);
    setTimeout(() => setCurrentIndex(prev => Math.max(prev - 1, 0)), 200);
  };

  return (
    <div className="tab-content" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '2rem', width: '100%', maxWidth: '620px' }}>
        <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
          ✨ AI Flashcards
        </h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem', lineHeight: 1.6 }}>
          Generate instant study cards from recent chat history, or type specific instructions for a custom quiz.
        </p>

        <textarea
          value={customInstructions}
          onChange={(e) => setCustomInstructions(e.target.value)}
          placeholder="e.g. Generate a quiz about the mitochondria…"
          style={{
            width: '100%',
            padding: '0.85rem 1rem',
            marginBottom: '1rem',
            backgroundColor: 'var(--bg-raised)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            resize: 'vertical',
            minHeight: '90px',
            fontFamily: 'inherit',
            fontSize: '0.9rem',
            lineHeight: 1.5,
            outline: 'none',
            transition: 'border-color 0.2s, box-shadow 0.2s',
          }}
          onFocus={e => { e.target.style.borderColor = 'var(--accent-border)'; e.target.style.boxShadow = '0 0 0 3px var(--accent-dim)'; }}
          onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; }}
        />

        <button
          className="btn btn-primary"
          onClick={generateFlashcards}
          disabled={loading}
          style={{ width: '100%', fontSize: '0.95rem', padding: '0.8rem' }}
        >
          {loading
            ? '⏳ Generating…'
            : customInstructions.trim() !== ''
              ? '✨ Generate Custom Quiz'
              : '✨ Generate Flashcards from Chat'}
        </button>
      </div>

      {/* Flashcard viewer */}
      {flashcards.length > 0 && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', maxWidth: '620px' }}>
          {/* Progress indicator */}
          <div style={{ width: '100%', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.78rem', color: 'var(--text-tertiary)' }}>
              <span>Card {currentIndex + 1} of {flashcards.length}</span>
              <span>{Math.round(((currentIndex + 1) / flashcards.length) * 100)}%</span>
            </div>
            <div style={{ height: '3px', background: 'var(--border)', borderRadius: '99px', overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${((currentIndex + 1) / flashcards.length) * 100}%`,
                background: 'linear-gradient(90deg, var(--accent), var(--pink))',
                borderRadius: '99px',
                transition: 'width 0.4s var(--ease-out)',
              }} />
            </div>
          </div>

          {/* 3D card */}
          <div
            className={`flashcard-container ${isFlipped ? 'flipped' : ''}`}
            onClick={() => setIsFlipped(!isFlipped)}
          >
            <div className="flashcard">
              {/* Front */}
              <div className="flashcard-front">
                <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--accent-light)', marginBottom: '1.25rem' }}>
                  Question
                </div>
                <h3 style={{ margin: 0, fontSize: '1.4rem', lineHeight: 1.5, fontWeight: 600 }}>
                  {flashcards[currentIndex].question}
                </h3>
                <div style={{ marginTop: 'auto', paddingTop: '1.5rem', fontSize: '0.8rem', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span style={{ fontSize: '1rem' }}>👆</span> Click to reveal answer
                </div>
              </div>

              {/* Back */}
              <div className="flashcard-back">
                <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--success)', marginBottom: '1.25rem' }}>
                  Answer
                </div>
                <p style={{ margin: 0, fontSize: '1.15rem', lineHeight: 1.6, fontWeight: 500 }}>
                  {flashcards[currentIndex].answer}
                </p>
                <div style={{ marginTop: 'auto', paddingTop: '1.5rem', fontSize: '0.8rem', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span style={{ fontSize: '1rem' }}>👆</span> Click to flip back
                </div>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginTop: '1.5rem', gap: '1rem' }}>
            <button
              className="btn"
              onClick={prevCard}
              disabled={currentIndex === 0}
              style={{ width: 'auto', flex: 1, opacity: currentIndex === 0 ? 0.4 : 1 }}
            >
              ← Previous
            </button>
            <button
              className="btn btn-primary"
              onClick={nextCard}
              disabled={currentIndex === flashcards.length - 1}
              style={{ width: 'auto', flex: 1, opacity: currentIndex === flashcards.length - 1 ? 0.4 : 1 }}
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
