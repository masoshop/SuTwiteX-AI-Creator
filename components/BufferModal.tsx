import React, { useState, useEffect } from 'react';
import { getProfiles, createPost } from '../services/bufferService';
import type { BufferProfile, EditableTweet } from '../types';
import BufferIcon from './icons/BufferIcon';
import InfoIcon from './icons/InfoIcon';
import CheckIcon from './icons/CheckIcon';
import CopyIcon from './icons/CopyIcon';

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
  
  const [postStatus, setPostStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const [remainingTweets, setRemainingTweets] = useState<EditableTweet[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  
  const isFetchingProfiles = postStatus === 'loading' && profiles.length === 0;

  useEffect(() => {
    if (token) {
      setPostStatus('loading');
      setError(null);
      getProfiles(token)
        .then(data => {
            setProfiles(data);
            if (data.length > 0) {
                setSelectedProfiles([data[0].id]);
            }
            setPostStatus('idle');
        })
        .catch(err => {
            const message = err instanceof Error ? err.message : "An unknown error occurred.";
            setError(`Failed to fetch profiles: ${message}. Please check your token or try again.`);
            setPostStatus('error');
        });
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
    if (selectedProfiles.length === 0 || !token) {
      setError("Please select at least one profile to post to.");
      return;
    }
    
    setPostStatus('loading');
    setError(null);

    const firstTweet = tweets[0];
    const restOfTweets = tweets.slice(1);
    
    try {
        const result = await createPost(token, firstTweet.content, selectedProfiles, firstTweet.media);
        if (result.success) {
            setPostStatus('success');
            if (restOfTweets.length > 0) {
              setRemainingTweets(restOfTweets);
            } else {
              setTimeout(onClose, 2500);
            }
        } else {
            throw new Error(result.message || "Failed to create post in Buffer.");
        }
    } catch (err) {
        const message = err instanceof Error ? err.message : "An unknown error occurred.";
        setError(message);
        setPostStatus('error');
    }
  };

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    });
  };
  
  const renderTokenInput = () => (
    <div className="text-center">
      <h2 className="text-xl font-bold mb-4">Connect to Buffer</h2>
      <p className="text-sm text-text-secondary mb-4">
        Provide your Buffer Developer Access Token to continue. You can create one from your Buffer App's settings page.
      </p>
      <form onSubmit={handleTokenSubmit}>
        <input
          type="password"
          value={localToken}
          onChange={e => setLocalToken(e.target.value)}
          placeholder="Enter your Access Token"
          className="w-full bg-bg-primary border border-border-primary rounded-lg p-3 focus:ring-2 focus:ring-accent-primary focus:shadow-glow-mint focus:outline-none transition"
        />
        <button type="submit" disabled={!localToken} className="w-full mt-4 py-3 bg-accent-primary text-bg-secondary rounded-full font-bold hover:opacity-90 transition disabled:opacity-50">
          Save Token
        </button>
      </form>
    </div>
  );

  const renderSuccessView = () => (
    <div className="text-center">
        <CheckIcon className="h-10 w-10 mx-auto text-success bg-success/10 rounded-full p-2 mb-4" />
        <h3 className="text-lg font-bold">Post Sent to Buffer!</h3>
        <p className="text-sm text-text-secondary">Closing this window...</p>
    </div>
  );

  const renderCopyThreadView = () => (
     <div>
        <div className="text-center mb-4">
            <CheckIcon className="h-8 w-8 mx-auto text-success bg-success/10 rounded-full p-1.5" />
            <h3 className="text-lg font-bold mt-2">First Tweet Sent!</h3>
            <p className="text-sm text-text-secondary">Copy the rest of your thread below and paste into the Buffer composer.</p>
        </div>
        <div className="space-y-3 max-h-60 overflow-y-auto pr-2 border-t border-b border-border-primary py-4 my-4">
            {remainingTweets.map((tweet, index) => (
                <div key={tweet.id} className="bg-bg-primary p-3 rounded-lg flex items-start gap-3">
                    <p className="flex-grow whitespace-pre-wrap text-sm text-text-primary">{tweet.content}</p>
                    <button 
                      onClick={() => handleCopy(tweet.content, index)} 
                      className="p-2 bg-border-primary text-text-primary rounded-full hover:bg-accent-primary/20 hover:text-accent-primary transition flex-shrink-0"
                      title="Copy Tweet"
                    >
                        {copiedIndex === index ? <CheckIcon className="h-4 w-4" /> : <CopyIcon className="h-4 w-4" />}
                    </button>
                </div>
            ))}
        </div>
        <button onClick={onClose} className="w-full mt-2 py-2 bg-accent-primary text-bg-secondary rounded-full font-bold hover:opacity-90 transition">
            Done
        </button>
     </div>
  );

  const renderSchedulerView = () => {
    if (isFetchingProfiles) {
        return <p className="text-center animate-pulse">Fetching profiles...</p>
    }
    if (postStatus === 'error' && profiles.length === 0) {
        return (
            <div className="text-center">
                <p className="text-danger mb-4">{error}</p>
                <button onClick={() => onSetToken('')} className="text-sm text-accent-primary hover:underline">
                    Use a different token
                </button>
            </div>
        );
    }

    return (
      <div>
        <h2 className="text-xl font-bold mb-4">Schedule with Buffer</h2>
        <div className="mb-4">
            <label className="block text-sm font-semibold text-text-secondary mb-2">Select Profiles to Post to</label>
            <div className="max-h-48 overflow-y-auto space-y-2 pr-2 border border-border-primary rounded-lg p-2 bg-bg-primary">
                 {profiles.map(profile => (
                    <div key={profile.id} className="flex items-center bg-bg-secondary p-2 rounded-md">
                        <input
                            type="checkbox"
                            id={`profile-${profile.id}`}
                            checked={selectedProfiles.includes(profile.id)}
                            onChange={() => handleProfileToggle(profile.id)}
                            className="h-4 w-4 rounded bg-border-primary border-border-primary text-accent-primary focus:ring-accent-primary"
                        />
                        <label htmlFor={`profile-${profile.id}`} className="ml-3 flex items-center cursor-pointer text-text-primary">
                            <img src={profile.avatar} alt={profile.formatted_username} className="h-8 w-8 rounded-full" />
                            <span className="ml-2 text-sm font-medium">{profile.formatted_username}</span>
                            <span className="ml-2 text-xs text-text-secondary capitalize">({profile.service})</span>
                        </label>
                    </div>
                 ))}
                 {profiles.length === 0 && <p className="text-center text-sm text-text-secondary p-4">No profiles found.</p>}
            </div>
        </div>

        <div className="flex items-start bg-accent-primary/10 border border-accent-primary/20 text-accent-primary/80 text-xs p-3 rounded-lg my-4">
            <InfoIcon className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
            <span>If posting a thread, only the first tweet & media will be sent. You will be prompted to copy the rest. Buffer's API does not support video uploads in this context.</span>
        </div>

        {postStatus === 'error' && <p className="text-danger text-center mb-4">{error}</p>}
        
        <button 
          onClick={handlePost} 
          disabled={postStatus === 'loading' || selectedProfiles.length === 0}
          className="w-full py-3 bg-accent-primary text-bg-secondary rounded-full font-bold hover:opacity-90 transition disabled:opacity-50 disabled:cursor-wait flex items-center justify-center gap-2"
        >
          <BufferIcon className="h-5 w-5"/>
          {postStatus === 'loading' ? 'Sending to Buffer...' : 'Send to Buffer'}
        </button>
      </div>
    );
  };

  const renderContent = () => {
    if (!token) {
        return renderTokenInput();
    }
    if (postStatus === 'success') {
        return remainingTweets.length > 0 ? renderCopyThreadView() : renderSuccessView();
    }
    return renderSchedulerView();
  }

  return (
    <div className="fixed inset-0 bg-bg-primary/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-bg-secondary border border-border-primary rounded-xl p-6 w-full max-w-md relative shadow-2xl shadow-black/50">
        <button onClick={onClose} className="absolute top-4 right-4 text-text-secondary hover:text-white">&times;</button>
        {renderContent()}
      </div>
       <style>{`
          .animate-fade-in { animation: fadeIn 0.3s ease-in-out; }
          @keyframes fadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
      `}</style>
    </div>
  );
};

export default BufferModal;