import React from 'react';

const LogoIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg width="24" height="24" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <defs>
      <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style={{ stopColor: '#48bfe3' }} />
        <stop offset="100%" style={{ stopColor: '#80ffdb' }} />
      </linearGradient>
    </defs>
    {/* Intertwined S and X */}
    <path 
      d="M65,10 C50,10 50,30 65,30 L35,70 C50,70 50,90 35,90" 
      stroke="url(#logoGradient)" 
      strokeWidth="14" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
    <path 
      d="M35,10 L65,40 M35,60 L65,90" 
      stroke="#F0F8FF"
      strokeOpacity="0.8"
      strokeWidth="14" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
    {/* AI Sparkle */}
    <path 
      d="M85 15 L88 25 L98 28 L88 31 L85 41 L82 31 L72 28 L82 25 Z"
      fill="#80ffdb"
    />
  </svg>
);

export default LogoIcon;
