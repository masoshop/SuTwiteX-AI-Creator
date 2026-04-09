
import React from 'react';
import CheckIcon from './icons/CheckIcon';
import LoaderIcon from './icons/LoaderIcon';
import SparklesIcon from './icons/SparklesIcon';

interface GenerationStatusProps {
  title: string;
  steps: string[];
  currentStepIndex: number;
  error?: string | null;
}

const GenerationStatus: React.FC<GenerationStatusProps> = ({ title, steps, currentStepIndex, error }) => {
  const isDone = currentStepIndex >= steps.length - 1 && !error;

  const renderErrorState = () => (
    <div className="text-center flex flex-col items-center justify-center p-8 h-full">
        <div className="w-24 h-24 mx-auto bg-danger/20 text-danger rounded-full flex items-center justify-center mb-4">
            <span className="text-5xl font-bold">!</span>
        </div>
        <h3 className="font-bold text-2xl text-danger mb-2">La Generación Falló</h3>
        <p className="text-text-secondary text-base max-w-sm">{error}</p>
    </div>
  );

  const renderSuccessState = () => (
    <div className="text-center flex flex-col items-center justify-center p-8 h-full">
        <div className="relative w-24 h-24">
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
     <div className="text-center flex flex-col items-center justify-center p-8 h-full">
        <div className="writing-animation-container">
            <div className="page-icon">
                <div className="page-line"></div>
                <div className="page-line"></div>
                <div className="page-line"></div>
                <div className="page-line"></div>
                <div className="page-line"></div>
            </div>
        </div>
        <h3 className="text-2xl font-bold mt-6">{title}</h3>
        <p className="text-text-secondary mt-1 h-6 transition-opacity duration-300">{steps[currentStepIndex]}</p>
     </div>
  );

  return (
    <div className="fixed inset-0 bg-bg-primary/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
        <div className="bg-bg-secondary border border-border-primary rounded-2xl shadow-2xl w-full max-w-md h-96">
            {error ? renderErrorState() : isDone ? renderSuccessState() : renderInProgressState()}
        </div>
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

            /* New Writing Animation Styles */
            .writing-animation-container {
                width: 100px;
                height: 100px;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .page-icon {
                width: 80px;
                height: 100px;
                background-color: #2a2744; /* bg-secondary shade */
                border: 2px solid #3a375e; /* border-primary */
                border-radius: 8px;
                padding: 12px;
                display: flex;
                flex-direction: column;
                justify-content: space-between;
                animation: page-breath 3s ease-in-out infinite;
            }
            .page-line {
                height: 6px;
                background-color: #4192f2; /* accent-primary */
                border-radius: 3px;
                transform-origin: left;
                animation: write-line-anim 3s ease-in-out infinite;
            }
            .page-line:nth-child(1) { width: 80%; animation-delay: 0s; }
            .page-line:nth-child(2) { width: 95%; animation-delay: 0.2s; }
            .page-line:nth-child(3) { width: 70%; animation-delay: 0.4s; }
            .page-line:nth-child(4) { width: 90%; animation-delay: 0.6s; }
            .page-line:nth-child(5) { width: 60%; animation-delay: 0.8s; }

            @keyframes page-breath {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.05); }
            }

            @keyframes write-line-anim {
                0% { transform: scaleX(0); }
                30% { transform: scaleX(1); }
                70% { transform: scaleX(1); }
                100% { transform: scaleX(0); }
            }
        `}</style>
    </div>
  );
};

export default GenerationStatus;
