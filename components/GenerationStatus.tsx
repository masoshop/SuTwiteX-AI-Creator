import React from 'react';
import CheckIcon from './icons/CheckIcon';
import LoaderIcon from './icons/LoaderIcon';
import SparklesIcon from './icons/SparklesIcon'; // Import sparkles for the final state

interface GenerationStatusProps {
  title: string;
  steps: string[];
  currentStepIndex: number;
  error?: string | null;
}

const GenerationStatus: React.FC<GenerationStatusProps> = ({ title, steps, currentStepIndex, error }) => {
  const progressPercentage = ((currentStepIndex + 1) / steps.length) * 100;
  const isDone = currentStepIndex >= steps.length - 1 && !error;

  const renderErrorState = () => (
    <div className="bg-danger/10 border border-danger/50 rounded-lg p-6 text-center animate-fade-in">
        <div className="w-16 h-16 mx-auto bg-danger/20 text-danger rounded-full flex items-center justify-center mb-4">
            <span className="text-4xl font-bold">!</span>
        </div>
        <h3 className="font-bold text-lg text-danger mb-2">La Generación Falló</h3>
        <p className="text-text-secondary text-sm">{error}</p>
    </div>
  );

  const renderSuccessState = () => (
    <div className="text-center flex flex-col items-center justify-center p-8 h-full">
        <div className="relative w-24 h-24">
            {/* Sparkles particles */}
            {[...Array(8)].map((_, i) => (
                <SparklesIcon key={i} className="absolute text-accent-primary sparkle" style={{'--i': i} as React.CSSProperties} />
            ))}
            <svg className="w-full h-full" viewBox="0 0 100 100">
                <circle className="stroke-accent-primary/20" strokeWidth="4" cx="50" cy="50" r="48" fill="transparent" />
                <circle className="stroke-accent-primary animate-progress-ring" strokeWidth="4" strokeLinecap="round" cx="50" cy="50" r="48" fill="transparent" strokeDasharray="301.59" strokeDashoffset="301.59" />
                <polyline className="stroke-white animate-checkmark" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" points="30,55 45,70 70,40" fill="transparent" strokeDasharray="100" strokeDashoffset="100" />
            </svg>
        </div>
        <h3 className="text-2xl font-bold mt-6 animate-fade-in-up" style={{animationDelay: '1s'}}>
            ¡Creación Completa!
        </h3>
        <p className="text-text-secondary mt-1 animate-fade-in-up" style={{animationDelay: '1.2s'}}>Tu obra maestra está lista.</p>
    </div>
  );

  const renderInProgressState = () => (
     <div className="p-4">
      <h3 className="font-bold text-center text-lg mb-4">{title}</h3>
      
      <div className="w-full bg-border-primary/50 rounded-full h-2.5 my-4 overflow-hidden">
        <div 
          className="h-2.5 rounded-full transition-all duration-500 bg-gradient-to-r from-accent-secondary to-accent-primary animate-glow" 
          style={{ width: `${progressPercentage}%` }}
        ></div>
      </div>

      <div className="space-y-4">
        {steps.slice(0, -1).map((step, index) => { // Exclude the "Done!" step
          const isCompleted = index < currentStepIndex;
          const isCurrent = index === currentStepIndex;

          let statusClasses = 'text-text-secondary';
          if (isCompleted) statusClasses = 'text-success';
          if (isCurrent) statusClasses = 'text-accent-primary';
          
          return (
            <div key={index} className="flex items-center space-x-4 transition-opacity duration-300" style={{opacity: isCompleted ? 0.7 : 1}}>
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${isCurrent ? 'border-accent-primary shadow-glow-primary' : isCompleted ? 'border-success bg-success/20' : 'border-border-primary'}`}>
                  {isCompleted ? (
                    <CheckIcon className="h-5 w-5 text-success" />
                  ) : isCurrent ? (
                    <LoaderIcon className="h-5 w-5 text-accent-primary" />
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-border-primary"></div>
                  )}
                </div>
                {index < steps.length - 2 && (
                  <div className={`w-0.5 h-6 mt-1 transition-colors ${isCompleted ? 'bg-success' : 'bg-border-primary'}`}></div>
                )}
              </div>
              <span className={`font-medium ${statusClasses}`}>{step}</span>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="bg-bg-secondary border border-border-primary rounded-lg animate-fade-in min-h-[300px] flex flex-col justify-center">
        {error ? renderErrorState() : isDone ? renderSuccessState() : renderInProgressState()}
        <style>{`
            @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            .animate-fade-in { animation: fadeIn 0.5s ease-out forwards; }
            
            @keyframes fadeInUp { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
            .animate-fade-in-up { animation: fadeInUp 0.5s ease-out forwards; }

            @keyframes progress-ring {
                0% { stroke-dashoffset: 301.59; }
                100% { stroke-dashoffset: 0; }
            }
            .animate-progress-ring { animation: progress-ring 1s cubic-bezier(0.65, 0, 0.35, 1) forwards; }
            
            @keyframes checkmark {
                to { stroke-dashoffset: 0; }
            }
            .animate-checkmark { animation: checkmark 0.5s cubic-bezier(0.65, 0, 0.35, 1) 0.8s forwards; }

            @keyframes glow {
                0%, 100% { box-shadow: 0 0 2px #62CBE1, 0 0 5px #d2bfee; }
                50% { box-shadow: 0 0 8px #62CBE1, 0 0 20px #d2bfee; }
            }
            .animate-glow { animation: glow 2s ease-in-out infinite; }
            
            @keyframes sparkle-burst {
                0% { transform: scale(0) rotate(0deg); opacity: 1; }
                80% { transform: scale(1) rotate(calc(var(--i) * 45deg)); opacity: 1; }
                100% { transform: scale(1.2) rotate(calc(var(--i) * 45deg)); opacity: 0; }
            }
            .sparkle {
                position: absolute;
                top: 50%;
                left: 50%;
                width: 1.5rem;
                height: 1.5rem;
                transform-origin: center;
                margin: -0.75rem;
                animation: sparkle-burst 1.5s ease-out 1s forwards;
                opacity: 0;
            }
        `}</style>
    </div>
  );
};

export default GenerationStatus;