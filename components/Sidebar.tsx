
import React from 'react';
import type { ViewType } from '../types';
import HomeIcon from './icons/HomeIcon';
import PlusCircleIcon from './icons/PlusCircleIcon';
import XLogoIcon from './icons/XLogoIcon';
// FIX: Import icons for new sidebar items
import BarChartIcon from './icons/BarChartIcon';
import CalendarIcon from './icons/CalendarIcon';

interface SidebarProps {
  activeView: ViewType;
  setActiveView: (view: ViewType) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeView, setActiveView }) => {
  // FIX: Add scheduler and analytics to navigation to provide access to all features.
  const navItems = [
    { id: 'dashboard', icon: <HomeIcon />, label: 'Dashboard' },
    { id: 'create', icon: <PlusCircleIcon />, label: 'Create' },
    { id: 'scheduler', icon: <CalendarIcon />, label: 'Scheduler' },
    { id: 'analytics', icon: <BarChartIcon />, label: 'Analytics' },
  ];

  return (
    <div className="fixed top-0 left-0 h-full w-20 md:w-64 bg-bg-secondary border-r border-border-primary flex flex-col justify-between p-4 transition-all duration-300">
      <div>
        <div className="mb-12 flex items-center justify-center md:justify-start">
            <XLogoIcon className="h-8 w-8 text-accent-primary" />
        </div>
        <nav>
          <ul>
            {navItems.map((item) => (
              <li key={item.id} className="mb-4">
                <button
                  onClick={() => setActiveView(item.id as ViewType)}
                  className={`w-full flex items-center p-3 rounded-full transition-colors duration-200 ${
                    activeView === item.id
                      ? 'bg-accent-primary/10 text-accent-primary'
                      : 'text-text-primary hover:bg-bg-primary/50'
                  }`}
                >
                  {item.icon}
                  <span className="hidden md:inline ml-4 font-bold">{item.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  );
};

export default Sidebar;