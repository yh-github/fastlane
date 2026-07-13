import React, { useEffect, useState } from 'react';

export interface SpeechBubbleProps {
  message: string;
}

export const SpeechBubble: React.FC<SpeechBubbleProps> = ({ message }) => {
  const [displayedText, setDisplayedText] = useState('');

  useEffect(() => {
    let currentIdx = 0;
    setDisplayedText(''); // Reset on new message
    
    // Typewriter effect
    const interval = setInterval(() => {
      if (currentIdx < message.length) {
        setDisplayedText(message.slice(0, currentIdx + 1));
        currentIdx++;
      } else {
        clearInterval(interval);
      }
    }, 30); // Speed of typing

    return () => clearInterval(interval);
  }, [message]);

  if (!message) return null;

  return (
    <div className="speech-bubble">
      <div className="speech-bubble-text">{displayedText}</div>
      <div className="speech-bubble-tail" />
    </div>
  );
};
