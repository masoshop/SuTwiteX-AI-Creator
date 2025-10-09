import React, { useState } from 'react';
import LogoIcon from './icons/LogoIcon';

interface AuthProps {
  onSetToken: (token: string) => void;
  error: string | null;
}

const Auth: React.FC<AuthProps> = ({ onSetToken, error }) => {
  const [token, setToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setIsLoading(true);
    // The parent component will handle the async verification
    onSetToken(token);
    // We don't setIsLoading(false) here because the component will unmount on success
  };

  return (
    <div className="flex min-h-screen bg-bg-primary items-center justify-center p-4">
      <div className="w-full max-w-md bg-bg-secondary border border-border-primary rounded-lg p-8 shadow-lg">
        <div className="flex flex-col items-center mb-6">
          <LogoIcon className="h-12 w-12 mb-4" />
          <h1 className="text-2xl font-bold text-text-primary">TwixAi Studio</h1>
          <p className="text-text-secondary mt-1">Connect your account to continue</p>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="token" className="block text-sm font-medium text-text-primary mb-2">
              X API v2 Bearer Token
            </label>
            <input
              type="password"
              id="token"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Enter your Bearer Token"
              className="w-full bg-bg-primary border border-border-primary rounded-lg p-3 focus:ring-2 focus:ring-accent-primary focus:shadow-glow-mint focus:outline-none transition text-text-primary"
              required
            />
             <p className="text-xs text-text-secondary mt-2">
                Your token is stored securely in your browser's local storage and is only used to communicate with the X API.
            </p>
          </div>
          
          {error && (
            <div className="bg-red-900/50 text-red-300 text-sm p-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          <div className="bg-yellow-900/30 border border-yellow-700 text-yellow-300 text-xs p-3 rounded-lg my-4">
            <b>Note:</b> Due to the X API's browser security policy (CORS), this app uses sample data for display. The AI content generation features are fully functional.
          </div>

          <button
            type="submit"
            disabled={isLoading || !token}
            className="w-full bg-accent-primary text-bg-secondary font-bold py-3 px-6 rounded-full hover:opacity-90 transition-colors disabled:opacity-50 disabled:cursor-wait"
          >
            {isLoading ? 'Connecting...' : 'Connect'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Auth;