import React from 'react';

const Intro: React.FC = () => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-bg-primary text-text-primary overflow-hidden">
      <div className="font-bold text-3xl md:text-5xl tracking-wider relative h-20 w-full max-w-xl flex items-center justify-center">
        <span className="creator-word absolute text-accent-primary">Creator</span>
        <span className="ai-word absolute text-accent-secondary">AI</span>
        <span className="x-word absolute">X</span>
        <span className="sutwit-word absolute">
          <span>Su</span>
          <span>Twit</span>
          <span>e</span>
        </span>
        <span className="final-logo absolute opacity-0">
          SuTwiteX AI Creator
        </span>
      </div>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes assemble {
          0% { transform: scale(1.5); opacity: 0; }
          40% { transform: scale(1); opacity: 1; }
          60% { transform: scale(1); opacity: 1; }
          100% { opacity: 0; transform: scale(0.5); }
        }
        
        @keyframes finalGlow {
          0% { opacity: 0; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.1); text-shadow: 0 0 15px #38BDF8, 0 0 25px #8B5CF6; }
          100% { opacity: 1; transform: scale(1); text-shadow: none; }
        }
        
        .creator-word, .ai-word, .x-word, .sutwit-word {
          animation: assemble 2s ease-in-out forwards;
          opacity: 0;
        }

        .sutwit-word span:nth-child(1) { animation-delay: 0.1s; }
        .sutwit-word span:nth-child(2) { animation-delay: 0.2s; }
        .sutwit-word span:nth-child(3) { animation-delay: 0.3s; }
        
        .x-word { animation-delay: 0.5s; }
        .ai-word { animation-delay: 1s; }
        .creator-word { animation-delay: 1.5s; }

        .final-logo {
          animation: finalGlow 1.5s ease-in-out 2s forwards;
        }
      `}</style>
    </div>
  );
};

export default Intro;
