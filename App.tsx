import React, { useState, useRef } from 'react';
import Intro from './components/Intro';
import { ContentStudio } from './components/ContentStudio';
// FIX: Changed to a named import to resolve the "no default export" error.
import { MultimediaCreator } from './components/MultimediaCreator';
import TextIcon from './components/icons/TextIcon';
import MediaIcon from './components/icons/MediaIcon';
import SparklesIcon from './components/icons/SparklesIcon';

type ActiveView = 'content' | 'multimedia';

// Define the type for the handles exposed by ContentStudio
type ContentStudioHandles = {
  generateTweet: () => void;
  generateThread: () => void;
};

const NavButton = ({ view, label, icon, activeView, setActiveView }: { view: ActiveView, label: string, icon: React.ReactNode, activeView: ActiveView, setActiveView: (view: ActiveView) => void }) => (
    <button
      onClick={() => setActiveView(view)}
      className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full text-sm font-bold transition-colors ${
        activeView === view
          ? 'bg-accent-primary text-white shadow-md'
          : 'text-text-secondary hover:bg-bg-secondary hover:text-text-primary'
      }`}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
);

const App: React.FC = () => {
  const [showIntro, setShowIntro] = useState(true);
  const [activeView, setActiveView] = useState<ActiveView>('content');
  const contentStudioRef = useRef<ContentStudioHandles>(null);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setShowIntro(false);
    }, 3500); 

    return () => clearTimeout(timer);
  }, []);
  
  if (showIntro) {
    return <Intro />;
  }
  
  const handleGenerateTweet = () => {
    contentStudioRef.current?.generateTweet();
  };

  const handleGenerateThread = () => {
    contentStudioRef.current?.generateThread();
  };

  return (
    <div className="min-h-screen font-sans text-text-primary">
      <nav className="fixed top-6 left-4 sm:left-8 z-30 flex items-center gap-2 p-1 bg-bg-secondary/80 backdrop-blur-md rounded-full border border-border-primary">
          <NavButton view="content" label="Content Studio" icon={<TextIcon className="h-5 w-5" />} activeView={activeView} setActiveView={setActiveView} />
          <NavButton view="multimedia" label="Multimedia Studio" icon={<MediaIcon className="h-5 w-5" />} activeView={activeView} setActiveView={setActiveView} />
      </nav>

      {activeView === 'content' && (
        <div className="fixed top-6 right-4 sm:right-8 z-30 flex items-center gap-2 sm:gap-4">
          <button 
            onClick={handleGenerateTweet} 
            className="flex items-center gap-2 px-3 sm:px-5 py-2.5 rounded-full font-bold transition-all duration-200 bg-accent-primary text-white shadow-[0_4px_15px_rgba(55,114,255,0.3)] hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(55,114,255,0.4)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
              <SparklesIcon className="h-5 w-5" />
              <span className="hidden sm:inline">Generar Tuit</span>
          </button>
          <button 
            onClick={handleGenerateThread} 
            className="flex items-center gap-2 px-3 sm:px-5 py-2.5 rounded-full font-bold transition-all duration-200 bg-accent-primary text-white shadow-[0_4px_15px_rgba(55,114,255,0.3)] hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(55,114,255,0.4)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
              <SparklesIcon className="h-5 w-5" />
              <span className="hidden sm:inline">Generar Hilo</span>
          </button>
        </div>
      )}
      
      <main className="pt-24 px-4 sm:px-8">
        <div style={{ display: activeView === 'content' ? 'block' : 'none' }}>
          <ContentStudio ref={contentStudioRef} />
        </div>
        <div style={{ display: activeView === 'multimedia' ? 'block' : 'none' }}>
          <MultimediaCreator />
        </div>
      </main>
    </div>
  );
};

export default App;