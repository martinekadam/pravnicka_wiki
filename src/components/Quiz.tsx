import React, { useState, ReactNode, isValidElement } from 'react';

interface QuizProps {
  question: string;
  topic?: string;
  children: ReactNode;
  quizNumber?: number;    
  highlightMode?: boolean; 
}

export function Quiz({ question, children, quizNumber, highlightMode }: QuizProps): JSX.Element {
  const childrenArray = React.Children.toArray(children);
  
  // Logic to count correct answers remains unchanged
  const correctCount = childrenArray.reduce((acc, child) => {
    if (isValidElement(child) && child.props.isCorrect === true) {
      return acc + 1;
    }
    return acc;
  }, 0);

  return (
    <div style={{
      border: '1px solid var(--ifm-color-emphasis-300)',
      borderRadius: '8px',
      padding: '1.5rem',
      backgroundColor: 'var(--ifm-background-surface-color)',
      marginBottom: '2rem',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <h2 style={{ marginTop: 0, fontSize: '1.5rem' }}>
          {quizNumber && <span style={{ opacity: 0.5, marginRight: '10px' }}>#{quizNumber}</span>}
          {question}
        </h2>
        
        <span style={{
          fontSize: '0.8rem',
          backgroundColor: 'var(--ifm-color-emphasis-200)',
          padding: '4px 8px',
          borderRadius: '12px',
          whiteSpace: 'nowrap'
        }}>
          Správných odpovědí: {correctCount}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {childrenArray.map((child, index) => {
          if (isValidElement(child)) {
            // Generate letter (0 = a, 1 = b, 2 = c...)
            const letter = String.fromCharCode(97 + index); 
            
            return React.cloneElement(child, { 
              ...child.props, 
              forceHighlight: highlightMode, //
              optionLabel: `${letter})`      // Passing the new auto-label
            });
          }
          return child;
        })}
      </div>
    </div>
  );
}

interface QuizOptionProps {
  label: string;
  isCorrect: boolean;
  children: ReactNode;
  forceHighlight?: boolean; 
  optionLabel?: string; // New prop for the auto-letter
}

export function QuizOption({ label, isCorrect, children, forceHighlight, optionLabel }: QuizOptionProps): JSX.Element {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const isHighlighted = (isOpen && isCorrect) || (forceHighlight && isCorrect); //
  const isWrong = (isOpen && !isCorrect); //

  return (
    <div style={{ marginBottom: '5px' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          textAlign: 'left',
          padding: '12px 15px',
          borderRadius: '5px',
          border: '1px solid var(--ifm-color-primary)', //
          cursor: 'pointer',
          backgroundColor: isHighlighted 
            ? 'rgba(40, 167, 69, 0.2)' 
            : isWrong 
              ? 'rgba(220, 53, 69, 0.2)' 
              : 'transparent',
          fontWeight: (isOpen || isHighlighted) ? 'bold' : 'normal',
          color: 'inherit'
        }}
      >
        {/* Display the auto-generated letter followed by the text */}
        {optionLabel && <span style={{ marginRight: '8px', opacity: 0.6 }}>{optionLabel}</span>}
        {label}
      </button>
      
      {/* Explanation box logic remains the same */}
      {(isOpen || (forceHighlight && isCorrect)) && (
        <div style={{
          marginTop: '8px',
          padding: '15px',
          fontSize: '0.95rem',
          borderLeft: `4px solid ${isCorrect ? '#05c517' : '#ec0000'}`, //
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

interface QuizFilterProps {
  children: ReactNode;
}

export function QuizFilter({ children }: QuizFilterProps): JSX.Element {
  const [activeTopic, setActiveTopic] = useState<string>('Všechna témata');
  const [showCorrect, setShowCorrect] = useState<boolean>(false);
  
  // Existing logic: Filter out unfinished questions
  const childrenArray = React.Children.toArray(children).filter(child => {
    return isValidElement(child) && child.props.topic; 
  });

  const topics = ['Všechna témata', ...new Set(childrenArray.map(child => {
    if (isValidElement(child) && child.props.topic) {
      return child.props.topic;
    }
    return null;
  }).filter((t): t is string => !!t))];

  const filteredChildren = childrenArray.filter(child => {
    if (activeTopic === 'Všechna témata') return true;
    return isValidElement(child) && child.props.topic === activeTopic;
  });

  return (
    <div>
      {/* Topic Buttons Row */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '2rem', flexWrap: 'wrap' }}>
        {topics.map(topic => (
          <button
            key={topic}
            onClick={() => setActiveTopic(topic)}
            style={{
              padding: '8px 16px',
              borderRadius: '20px',
              border: '1px solid var(--ifm-color-primary)',
              backgroundColor: activeTopic === topic ? 'var(--ifm-color-primary)' : 'transparent',
              color: activeTopic === topic ? '#fff' : 'var(--ifm-color-primary)',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            {topic}
          </button>
        ))}
      </div>

      {/* NEW: Counter and Toggle Button on the same line */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '1rem' 
      }}>
        <div style={{ fontSize: '0.9rem', opacity: 0.7, fontWeight: 'bold' }}>
          Počet otázek: {filteredChildren.length} {activeTopic !== 'Všechna témata' && `z ${childrenArray.length}`}
        </div>

        <button 
          onClick={() => setShowCorrect(!showCorrect)}
          style={{
            padding: '5px 12px',
            fontSize: '0.8rem',
            borderRadius: '5px',
            cursor: 'pointer',
            border: '1px solid var(--ifm-color-primary)',
            background: showCorrect ? 'var(--ifm-color-primary)' : 'transparent',
            color: showCorrect ? 'white' : 'var(--ifm-color-primary)'
          }}
        >
          {showCorrect ? 'Skrýt správné odpovědi' : 'Ukázat správné odpovědi'}
        </button>
      </div>

      <div>
        {/* Mapping through filtered children */}
        {filteredChildren.length > 0 ? (
          filteredChildren.map((child, index) => {
            if (isValidElement(child)) {
              return React.cloneElement(child, { 
                ...child.props, 
                quizNumber: index + 1,
                highlightMode: showCorrect
              });
            }
            return child;
          })
        ) : (
          <p>Na toto téma žádné otázky nemáme.</p>
        )}
      </div>
    </div>
  );
}