
import React, { useState } from 'react';
import Intro from './components/Intro';
import ContentStudio from './components/ContentStudio';
import MultimediaCreator from './components/MultimediaCreator';
import LogoIcon from './components/icons/LogoIcon';
import TextIcon from './components/icons/TextIcon';
import MediaIcon from './components/icons/MediaIcon';

type ActiveView = 'content' | 'multimedia';

const NavButton = ({ view, label, icon, activeView, setActiveView }: { view: ActiveView, label: string, icon: React.ReactNode, activeView: ActiveView, setActiveView: (view: ActiveView) => void }) => (
    <button
      onClick={() => setActiveView(view)}
      className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-colors ${
        activeView === view
          ? 'bg-accent-primary text-white shadow-md'
          : 'text-text-secondary hover:bg-bg-secondary hover:text-text-primary'
      }`}
    >
      {icon}
      {label}
    </button>
);

const App: React.FC = () => {
  const [showIntro, setShowIntro] = useState(true);
  const [activeView, setActiveView] = useState<ActiveView>('content');

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
      <nav className="fixed top-6 right-4 sm:right-8 z-30 flex items-center gap-2 p-1 bg-bg-secondary/80 backdrop-blur-md rounded-full border border-border-primary">
          <NavButton view="content" label="Content Studio" icon={<TextIcon className="h-5 w-5" />} activeView={activeView} setActiveView={setActiveView} />
          <NavButton view="multimedia" label="Multimedia Studio" icon={<MediaIcon className="h-5 w-5" />} activeView={activeView} setActiveView={setActiveView} />
      </nav>

      <main className="p-4 sm:p-8">
        <div className="mb-8 flex items-center gap-3">
          <LogoIcon className="h-10 w-10" />
          <h1 className="text-3xl font-bold text-text-primary">SuTwiteX AI Creator</h1>
        </div>
        
        {activeView === 'content' && <ContentStudio />}
        {activeView === 'multimedia' && <MultimediaCreator />}
      </main>
    </div>
  );
};

export default App;