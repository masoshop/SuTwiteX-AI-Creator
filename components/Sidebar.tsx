
import React from 'react';
import HomeIcon from './icons/HomeIcon';
import LogoIcon from './icons/LogoIcon';

const Sidebar: React.FC = () => {
  const navItems = [
    { id: 'contentStudio', icon: <HomeIcon />, label: 'Content Studio' },
  ];

  return (
    <div className="fixed top-0 left-0 h-full w-20 md:w-64 bg-bg-secondary border-r border-border-primary flex flex-col justify-between p-4 transition-all duration-300 z-10">
      <div>
        <div className="mb-12 flex items-center justify-center md:justify-start gap-2">
            <LogoIcon className="h-8 w-8 flex-shrink-0" />
            <h1 className="hidden md:inline text-xl font-bold text-text-primary">TwixAi</h1>
        </div>
        <nav>
          <ul>
            {navItems.map((item) => (
                <li key={item.id} className="mb-4">
                  <div
                    className="w-full flex items-center p-3 rounded-full bg-accent-primary/10 text-accent-primary"
                  >
                    {item.icon}
                    <span className="hidden md:inline ml-4 font-bold">{item.label}</span>
                  </div>
                </li>
              )
            )}
          </ul>
        </nav>
      </div>
    </div>
  );
};

export default Sidebar;