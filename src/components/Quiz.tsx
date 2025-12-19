import React, { useState, ReactNode } from 'react';

// Define the "Rules" for the Main Quiz wrapper
interface QuizProps {
  question: string;
  children: ReactNode;
}

export function Quiz({ question, children }: QuizProps): JSX.Element {
  return (
    <div style={{
      border: '1px solid var(--ifm-color-emphasis-300)',
      borderRadius: '8px',
      padding: '1.5rem',
      backgroundColor: 'var(--ifm-background-surface-color)',
      marginBottom: '2rem',
    }}>
      <h2 style={{ marginTop: 0, fontSize: '1.5rem' }}>{question}</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {children}
      </div>
    </div>
  );
}

// Define the "Rules" for the individual options
interface QuizOptionProps {
  label: string;
  isCorrect: boolean;
  children: ReactNode;
}

export function QuizOption({ label, isCorrect, children }: QuizOptionProps): JSX.Element {
  const [isOpen, setIsOpen] = useState<boolean>(false);

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
             <strong>{isCorrect ? '✅ Správně' : '❌ Nesprávně'}</strong>
          </div>
          <div className="quiz-explanation-content">
            {children}
          </div>
        </div>
      )}
    </div>
  );
}