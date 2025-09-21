
import React, { useState, useEffect } from 'react';
import { getProfiles, createPost } from '../services/bufferService';
import type { BufferProfile, EditableTweet } from '../types';
import BufferIcon from './icons/BufferIcon';
import InfoIcon from './icons/InfoIcon';

interface BufferModalProps {
  tweets: EditableTweet[];
  onClose: () => void;
  token: string | null;
  onSetToken: (token: string) => void;
}

const BufferModal: React.FC<BufferModalProps> = ({ tweets, onClose, token, onSetToken }) => {
  const [localToken, setLocalToken] = useState('');

  const [profiles, setProfiles] = useState<BufferProfile[]>([]);
  const [selectedProfiles, setSelectedProfiles] = useState<string[]>([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      setIsLoading(true);
      setError(null);
      getProfiles(token)
        .then(data => {
            setProfiles(data);
            // Pre-select the first profile
            if (data.length > 0) {
                setSelectedProfiles([data[0].id]);
            }
        })
        .catch(err => {
            const message = err instanceof Error ? err.message : "An unknown error occurred.";
            setError(`Failed to fetch profiles: ${message}. Please check your token or try again.`);
        })
        .finally(() => setIsLoading(false));
    }
  }, [token]);

  const handleTokenSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (localToken) {
      onSetToken(localToken);
    }
  };

  const handleProfileToggle = (profileId: string) => {
    setSelectedProfiles(prev =>
      prev.includes(profileId) ? prev.filter(id => id !== profileId) : [...prev, profileId]
    );
  };

  const handlePost = async () => {
    if (selectedProfiles.length === 0) {
      setError("Please select at least one profile to post to.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    const combinedText = tweets.map(t => t.content).join('\n\n');
    const firstMedia = tweets.find(t => t.media)?.media ?? null;

    try {
        if (!token) throw new Error("Buffer token is not available.");
        const result = await createPost(token, combinedText, selectedProfiles, firstMedia);
        if (result.success) {
            setSuccessMessage(`Successfully sent post to Buffer! (${result.updates.length} update${result.updates.length > 1 ? 's' : ''})`);
            setTimeout(onClose, 3000);
        } else {
            throw new Error(result.message || "Failed to create post.");
        }
    } catch (err) {
        const message = err instanceof Error ? err.message : "An unknown error occurred.";
        setError(message);
    } finally {
        setIsLoading(false);
    }
  };
  
  const renderTokenInput = () => (
    <div className="text-center">
      <h2 className="text-xl font-bold mb-4">Connect to Buffer</h2>
      <p className="text-sm text-x-light-gray mb-4">
        Please provide your Buffer Developer Access Token to continue. You can create one from your Buffer App's settings page.
      </p>
      <form onSubmit={handleTokenSubmit}>
        <input
          type="password"
          value={localToken}
          onChange={e => setLocalToken(e.target.value)}
          placeholder="Enter your Access Token"
          className="w-full bg-x-darker-blue border border-gray-700 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:outline-none transition text-white"
        />
        <button type="submit" disabled={!localToken} className="w-full mt-4 py-3 bg-x-blue rounded-full font-bold hover:bg-blue-500 transition disabled:opacity-50">
          Save Token
        </button>
      </form>
    </div>
  );

  const renderContent = () => {
    if (!token) {
        return renderTokenInput();
    }
    if (isLoading && profiles.length === 0) {
        return <p className="text-center animate-pulse">Fetching profiles...</p>
    }
    if (error && profiles.length === 0) {
        return (
            <div>
                <p className="text-red-400 text-center mb-4">{error}</p>
                <button onClick={() => onSetToken('')} className="w-full text-center text-sm text-x-blue hover:underline">
                    Use a different token
                </button>
            </div>
        );
    }

    return (
      <div>
        <h2 className="text-xl font-bold mb-4">Schedule with Buffer</h2>
        <div className="mb-4">
            <label className="block text-sm font-semibold text-x-light-gray mb-2">Select Profiles</label>
            <div className="max-h-48 overflow-y-auto space-y-2 pr-2 border border-gray-700 rounded-lg p-2">
                 {profiles.map(profile => (
                    <div key={profile.id} className="flex items-center bg-x-darker-blue p-2 rounded-md">
                        <input
                            type="checkbox"
                            id={`profile-${profile.id}`}
                            checked={selectedProfiles.includes(profile.id)}
                            onChange={() => handleProfileToggle(profile.id)}
                            className="h-4 w-4 rounded bg-gray-700 border-gray-600 text-x-blue focus:ring-x-blue"
                        />
                        <label htmlFor={`profile-${profile.id}`} className="ml-3 flex items-center cursor-pointer">
                            <img src={profile.avatar} alt={profile.formatted_username} className="h-8 w-8 rounded-full" />
                            <span className="ml-2 text-sm font-medium">{profile.formatted_username}</span>
                            <span className="ml-2 text-xs text-x-dark-gray capitalize">({profile.service})</span>
                        </label>
                    </div>
                 ))}
            </div>
        </div>

        <div className="flex items-start bg-blue-900/30 border border-blue-700 text-blue-300 text-xs p-3 rounded-lg my-4">
            <InfoIcon className="h-5 w-5 mr-2 flex-shrink-0" />
            <span>If posting a thread, all tweets will be combined into a single post. Only the first image attachment will be used. Buffer's API does not support video uploads in this context.</span>
        </div>

        {error && <p className="text-red-400 text-center mb-4">{error}</p>}
        {successMessage && <p className="text-green-400 text-center mb-4">{successMessage}</p>}

        <button 
          onClick={handlePost} 
          disabled={isLoading || selectedProfiles.length === 0 || !!successMessage}
          className="w-full py-3 bg-x-blue rounded-full font-bold hover:bg-blue-500 transition disabled:opacity-50 disabled:cursor-wait flex items-center justify-center gap-2"
        >
          <BufferIcon className="h-5 w-5"/>
          {isLoading ? 'Sending to Buffer...' : 'Send to Buffer'}
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-x-dark-blue border border-gray-800 rounded-xl p-6 w-full max-w-md relative">
        <button onClick={onClose} className="absolute top-3 right-3 text-x-light-gray hover:text-white">&times;</button>
        {renderContent()}
      </div>
       <style>{`
          .overflow-y-auto::-webkit-scrollbar { width: 8px; }
          .overflow-y-auto::-webkit-scrollbar-track { background: #10171E; }
          .overflow-y-auto::-webkit-scrollbar-thumb { background: #3f4a5b; border-radius: 4px; }
          .overflow-y-auto::-webkit-scrollbar-thumb:hover { background: #525f75; }
          .animate-fade-in { animation: fadeIn 0.3s ease-in-out; }
          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </div>
  );
};

export default BufferModal;
