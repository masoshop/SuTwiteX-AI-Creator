
import React from 'react';
import LogoIcon from './icons/LogoIcon';
import TextIcon from './icons/TextIcon';
import MediaIcon from './icons/MediaIcon';

type ActiveView = 'content' | 'multimedia';

interface HeaderProps {
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
}

const Header: React.FC<HeaderProps> = ({ activeView, setActiveView }) => {
  const NavButton = ({ view, label, icon }: { view: ActiveView, label: string, icon: React.ReactNode }) => (
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

  return (
    <header className="fixed top-0 left-0 w-full bg-bg-primary/80 backdrop-blur-md border-b border-border-primary z-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 flex items-center justify-between h-20">
        <div className="flex items-center gap-3">
          <LogoIcon className="h-8 w-8" />
          <h1 className="text-xl font-bold text-text-primary">TwixAi</h1>
        </div>
        <nav className="flex items-center gap-2 p-1 bg-bg-secondary/50 rounded-full border border-border-primary">
          <NavButton view="content" label="Content Studio" icon={<TextIcon className="h-5 w-5" />} />
          <NavButton view="multimedia" label="Multimedia Studio" icon={<MediaIcon className="h-5 w-5" />} />
        </nav>
      </div>
    </header>
  );
};

export default Header;