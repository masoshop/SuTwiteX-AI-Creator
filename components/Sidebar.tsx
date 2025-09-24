
import React from 'react';
import type { ViewType } from '../types';
import HomeIcon from './icons/HomeIcon';
import LogoIcon from './icons/LogoIcon';
import MediaIcon from './icons/MediaIcon';

interface SidebarProps {
  activeView: ViewType;
  setActiveView: (view: ViewType) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeView, setActiveView }) => {
  const navItems = [
    { id: 'dashboard', icon: <HomeIcon />, label: 'Dashboard' },
    { id: 'multimedia', icon: <MediaIcon />, label: 'Create Multimedia' },
  ];

  return (
    <div className="fixed top-0 left-0 h-full w-20 md:w-64 bg-bg-secondary border-r border-border-primary flex flex-col justify-between p-4 transition-all duration-300">
      <div>
        <div className="mb-12 flex items-center justify-center md:justify-start gap-2">
            <LogoIcon className="h-8 w-8 flex-shrink-0" />
            <h1 className="hidden md:inline text-xl font-bold text-text-primary">SuTwiteX</h1>
        </div>
        <nav>
          <ul>
            {navItems.map((item) => {
              const isActive = activeView === item.id;
              return (
                <li key={item.id} className="mb-4">
                  <button
                    onClick={() => setActiveView(item.id as ViewType)}
                    className={`w-full flex items-center p-3 rounded-full transition-colors duration-200 ${
                      isActive
                        ? 'bg-accent-primary/10 text-accent-primary'
                        : 'text-text-primary hover:bg-bg-primary/50'
                    }`}
                  >
                    {item.icon}
                    <span className="hidden md:inline ml-4 font-bold">{item.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </div>
  );
};

export default Sidebar;
