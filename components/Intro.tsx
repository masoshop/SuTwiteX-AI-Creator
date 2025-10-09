import React from 'react';
import LogoIcon from './icons/LogoIcon';

const Intro: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-bg-primary text-text-primary overflow-hidden">
      <div className="intro-container text-center">
        <LogoIcon className="h-24 w-24 inline-block" />
        <h1 className="text-4xl font-bold tracking-wider mt-6 text-transparent bg-clip-text bg-gradient-to-r from-accent-primary to-accent-secondary">
          TwixAi Studio
        </h1>
      </div>
      <style>{`
        @keyframes introGlow {
          0% { 
            opacity: 0; 
            transform: scale(0.9); 
          }
          100% { 
            opacity: 1; 
            transform: scale(1); 
          }
        }
        .intro-container {
          animation: introGlow 2.5s cubic-bezier(0.165, 0.84, 0.44, 1) forwards;
        }
        .intro-container svg {
            filter: drop-shadow(0 0 12px rgba(58, 141, 255, 0.4));
        }
      `}</style>
    </div>
  );
};

export default Intro;