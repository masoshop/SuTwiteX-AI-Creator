import React from 'react';

const LogoIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <defs>
      <linearGradient id="logo-bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#4A267A" />
        <stop offset="100%" stopColor="#2C1D44" />
      </linearGradient>
      <linearGradient id="logo-x" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#3A8DFF" />
        <stop offset="100%" stopColor="#DD2A7B" />
      </linearGradient>
      <clipPath id="pen-clip">
        <path d="M86.13 25.54L74.46 13.87C71.73 11.14 67.3 11.14 64.57 13.87L22.84 55.6C22.13 56.31 21.64 57.22 21.43 58.21L17.5 77.58C17.15 79.28 18.72 80.85 20.42 80.5L39.79 76.57C40.78 76.36 41.69 75.87 42.4 75.16L84.13 33.43C86.86 30.7 86.86 28.27 86.13 25.54Z" />
      </clipPath>
    </defs>
    <rect width="100" height="100" rx="22" fill="url(#logo-bg)"/>
    <g clipPath="url(#pen-clip)">
        <path d="M25 75L75 25" stroke="url(#logo-x)" strokeWidth="28" strokeLinecap="round" />
        <path d="M25 25L75 75" stroke="url(#logo-x)" strokeWidth="28" strokeLinecap="round" />
    </g>
    <path d="M86.13 25.54L74.46 13.87C71.73 11.14 67.3 11.14 64.57 13.87L22.84 55.6C22.13 56.31 21.64 57.22 21.43 58.21L17.5 77.58C17.15 79.28 18.72 80.85 20.42 80.5L39.79 76.57C40.78 76.36 41.69 75.87 42.4 75.16L84.13 33.43C86.86 30.7 86.86 28.27 86.13 25.54Z" stroke="rgba(255,255,255,0.1)" strokeWidth="2"/>
    <path d="M68 17.5L82.5 32" stroke="rgba(255,255,255,0.15)" strokeWidth="5" strokeLinecap="round"/>
</svg>
);

export default LogoIcon;