import React, { useState } from 'react';

export default function Quiz({ question, options = [] }) {
  const [selected, setSelected] = useState(null);

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
        {options.map((option, index) => (
          <div key={index}>
            <button
              onClick={() => setSelected(index)}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '12px 15px',
                borderRadius: '5px',
                border: '1px solid var(--ifm-color-primary)',
                cursor: 'pointer',
                backgroundColor: selected === index 
                  ? (option.isCorrect ? '#d4edda' : '#f8d7da') 
                  : 'transparent',
                fontWeight: selected === index ? 'bold' : 'normal',
                color: 'inherit' // Ensures text is visible in dark mode
              }}
            >
              {/* FIXED: We specifically call .text here */}
              <strong>{String.fromCharCode(65 + index)})</strong> {option.text}
            </button>
            
            {selected === index && (
              <div style={{
                marginTop: '8px',
                padding: '10px 15px',
                fontSize: '0.9rem',
                color: 'black', // High contrast for the explanation
                borderLeft: `3px solid ${option.isCorrect ? '#28a745' : '#dc3545'}`,
                backgroundColor: '#f9f9f9',
                borderRadius: '0 5px 5px 0'
              }}>
                <strong>{option.isCorrect ? '✅ Correct: ' : '❌ Incorrect: '}</strong>
                {option.explanation}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}