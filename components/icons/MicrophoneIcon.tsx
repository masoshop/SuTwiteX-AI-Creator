import React from 'react';

const MicrophoneIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" {...props}>
    <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm5 10.5a.5.5 0 01.5.5v.5a.5.5 0 01-1 0V15a.5.5 0 01.5-.5zM8 15a.5.5 0 00-.5.5v.5a.5.5 0 001 0V15A.5.5 0 008 15zm-2 0a.5.5 0 01.5.5v.5a.5.5 0 01-1 0V15a.5.5 0 01.5-.5zm8.5-.5a.5.5 0 00-1 0v.5a.5.5 0 001 0v-.5a.5.5 0 000-1z" clipRule="evenodd" />
    <path d="M5 7a1 1 0 00-1 1v1a4 4 0 004 4h2a4 4 0 004-4V8a1 1 0 10-2 0v1a2 2 0 01-2 2H8a2 2 0 01-2-2V8a1 1 0 00-1-1z" />
  </svg>
);

export default MicrophoneIcon;