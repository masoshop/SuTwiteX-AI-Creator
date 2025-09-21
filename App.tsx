
import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard';
import XLogoIcon from './components/icons/XLogoIcon';
import Intro from './components/Intro';

const App: React.FC = () => {
  const [showIntro, setShowIntro] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowIntro(false);
    }, 3500); 

    return () => clearTimeout(timer);
  }, []);

  if (showIntro) {
    return <Intro />;
  }

  return (
    <div className="min-h-screen bg-bg-primary font-sans text-text-primary">
      <header className="p-4 border-b border-border-primary">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
           <XLogoIcon className="h-8 w-8 text-accent-primary" />
           <h1 className="text-xl font-bold">SuTwiteX AI Creator</h1>
        </div>
      </header>
      <main className="p-4 sm:p-8">
        <Dashboard />
      </main>
    </div>
  );
};

export default App;