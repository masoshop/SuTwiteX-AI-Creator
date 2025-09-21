import React from 'react';
import CheckIcon from './icons/CheckIcon';
import LoaderIcon from './icons/LoaderIcon';

interface GenerationStatusProps {
  title: string;
  steps: string[];
  currentStepIndex: number;
  error?: string | null;
}

const GenerationStatus: React.FC<GenerationStatusProps> = ({ title, steps, currentStepIndex, error }) => {
  const progressPercentage = (currentStepIndex / steps.length) * 100;

  return (
    <div className="bg-bg-primary border border-border-primary rounded-lg p-4 animate-fade-in">
      <h3 className="font-bold text-center text-lg mb-2">{title}</h3>
      
      <div className="w-full bg-border-primary rounded-full h-2 my-4">
        <div 
          className={`h-2 rounded-full transition-all duration-500 ${error ? 'bg-red-500' : 'bg-accent-primary'}`} 
          style={{ width: `${error ? 100 : progressPercentage}%` }}
        ></div>
      </div>

      <div className="space-y-4">
        {steps.map((step, index) => {
          const isCompleted = index < currentStepIndex;
          const isCurrent = index === currentStepIndex && !error;
          const isPending = index > currentStepIndex;

          let statusClasses = 'text-text-secondary';
          if (isCompleted) statusClasses = 'text-green-400';
          if (isCurrent) statusClasses = 'text-accent-primary';
          
          return (
            <div key={index} className="flex items-center space-x-4">
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${isCurrent ? 'border-accent-primary animate-pulse' : isCompleted ? 'border-green-500 bg-green-500/20' : 'border-border-primary'}`}>
                  {isCompleted ? (
                    <CheckIcon className="h-5 w-5 text-green-400" />
                  ) : isCurrent ? (
                    <LoaderIcon className="h-5 w-5 text-accent-primary" />
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-border-primary"></div>
                  )}
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-0.5 h-6 mt-1 ${isCompleted ? 'bg-green-500' : 'bg-border-primary'}`}></div>
                )}
              </div>
              <span className={`font-medium ${statusClasses}`}>{step}</span>
            </div>
          );
        })}
      </div>
      {error && (
        <div className="mt-4 bg-red-900/50 border border-red-700 text-red-300 text-sm p-3 rounded-lg">
          <p><strong>Error:</strong> {error}</p>
        </div>
      )}
    </div>
  );
};

export default GenerationStatus;