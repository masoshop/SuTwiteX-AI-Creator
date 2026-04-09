
import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import { MultimediaCreator } from './components/MultimediaCreator';
import Intro from './components/Intro';
import SparklesIcon from './components/icons/SparklesIcon';
import type { ActiveView, XUserProfile } from './types';

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<ActiveView>('content');
  const [isLoading, setIsLoading] = useState(true);
  const [token, setToken] = useState<string | null>(localStorage.getItem('x-token'));
  const [userProfile, setUserProfile] = useState<XUserProfile | null>(null);
  
  useEffect(() => {
    setTimeout(() => setIsLoading(false), 1500);
  }, []);

  const renderActiveView = () => {
    switch (activeView) {
      case 'content':
        return <Dashboard />;
      case 'multimedia':
        return <MultimediaCreator />;
      default:
        return <Dashboard />;
    }
  };

  if (isLoading) {
    return <Intro />;
  }

  return (
    <div className="min-h-screen bg-bg-primary transition-colors duration-300">
      <Header 
        activeView={activeView} 
        setActiveView={setActiveView}
      />
      <main className="pt-28 pb-8 px-4 sm:px-8">
        {renderActiveView()}
      </main>
    </div>
  );
};

export default App;
