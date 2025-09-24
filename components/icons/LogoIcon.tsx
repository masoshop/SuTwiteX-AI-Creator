import React from 'react';

const LogoIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg width="100" height="100" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <defs>
      <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style={{ stopColor: '#3B82F6' }} /> 
        <stop offset="100%" style={{ stopColor: '#10B981' }} />
      </linearGradient>
    </defs>
    {/* A modern, abstract shape combining a spark and a swoosh */}
    <path 
      d="M50 15 C60 25, 75 40, 75 50 C75 60, 60 75, 50 85 C40 75, 25 60, 25 50 C25 40, 40 25, 50 15 Z M50 35 L55 45 L65 50 L55 55 L50 65 L45 55 L35 50 L45 45 Z" 
      fill="url(#logoGradient)"
      transform="rotate(15 50 50)"
    />
  </svg>
);

export default LogoIcon;
