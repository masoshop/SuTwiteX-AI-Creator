
import React, { useState } from 'react';
import Intro from './components/Intro';
import Sidebar from './components/Sidebar';
import ContentStudio from './components/ContentStudio';

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
    <div className="min-h-screen font-sans text-text-primary bg-bg-primary">
      <Sidebar />
      <main className="ml-20 md:ml-64 p-4 sm:p-8">
        <ContentStudio />
      </main>
    </div>
  );
};

export default App;
