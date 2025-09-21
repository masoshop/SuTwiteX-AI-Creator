
import React, { useState } from 'react';
import Dashboard from './components/Dashboard';
import Intro from './components/Intro';

const App: React.FC = () => {
  const [showIntro, setShowIntro] = useState(true);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setShowIntro(false);
    }, 3500); 

    return () => clearTimeout(timer);
  }, []);

  if (showIntro) {
    return <Intro />;
  }

  return (
    <div className="min-h-screen font-sans text-text-primary">
      <main className="p-4 sm:p-8">
        <Dashboard />
      </main>
    </div>
  );
};

export default App;
