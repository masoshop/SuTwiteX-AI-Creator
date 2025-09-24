
import React, { useState } from 'react';
import Dashboard from './components/Dashboard';
import Intro from './components/Intro';
import Sidebar from './components/Sidebar';
import MultimediaCreator from './components/MultimediaCreator';
import type { ViewType } from './types';

const App: React.FC = () => {
  const [showIntro, setShowIntro] = useState(true);
  const [activeView, setActiveView] = useState<ViewType>('dashboard');

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setShowIntro(false);
    }, 3500); 

    return () => clearTimeout(timer);
  }, []);

  if (showIntro) {
    return <Intro />;
  }

  const renderView = () => {
    switch (activeView) {
      case 'dashboard':
        return <Dashboard />;
      case 'multimedia':
        return <MultimediaCreator />;
      default:
        return <Dashboard />;
    }
  };


  return (
    <div className="min-h-screen font-sans text-text-primary bg-bg-primary">
      <Sidebar activeView={activeView} setActiveView={setActiveView} />
      <main className="ml-20 md:ml-64 p-4 sm:p-8">
        {renderView()}
      </main>
    </div>
  );
};

export default App;
