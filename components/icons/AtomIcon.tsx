
import React from 'react';

const AtomIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} {...props}>
     <ellipse cx="12" cy="12" rx="3" ry="3" />
     <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(45 12 12)" />
     <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(-45 12 12)" />
  </svg>
);

export default AtomIcon;
