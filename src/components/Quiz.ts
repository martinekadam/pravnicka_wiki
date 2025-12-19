import React, { useState } from 'react';

export function Quiz({ question, children }) {
  return (
    <div style={{
      border: '1px solid var(--ifm-color-emphasis-300)',
      borderRadius: '8px',
      padding: '1.5rem',
      backgroundColor: 'var(--ifm-background-surface-color)',
      marginBottom: '2rem',
    }}>
      <h3 style={{ marginTop: 0 }}>{question}</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {children}
      </div>
    </div>
  );
}

export function QuizOption({ label, isCorrect, children }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div style={{ marginBottom: '5px' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          textAlign: 'left',
          padding: '12px 15px',
          borderRadius: '5px',
          border: '1px solid var(--ifm-color-primary)',
          cursor: 'pointer',
          backgroundColor: isOpen 
            ? (isCorrect ? 'rgba(40, 167, 69, 0.2)' : 'rgba(220, 53, 69, 0.2)') 
            : 'transparent',
          fontWeight: isOpen ? 'bold' : 'normal',
          color: 'inherit'
        }}
      >
        {label}
      </button>
      
      {isOpen && (
        <div style={{
          marginTop: '8px',
          padding: '15px',
          fontSize: '0.95rem',
          borderLeft: `4px solid ${isCorrect ? '#28a745' : '#dc3545'}`,
          backgroundColor: 'var(--ifm-color-emphasis-100)',
          borderRadius: '0 5px 5px 0',
        }}>
          <div style={{ marginBottom: '8px' }}>
             <strong>{isCorrect ? '✅ Correct' : '❌ Incorrect'}</strong>
          </div>
          {/* This renders whatever Markdown/HTML you put inside the tags */}
          <div className="quiz-explanation-content">
            {children}
          </div>
        </div>
      )}
    </div>
  );
}