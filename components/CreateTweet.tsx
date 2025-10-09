
import React, { useState, useCallback } from 'react';
import { generateTweet, generateTweetThread, generateImage, generateVideo, summarizeUrl } from '../services/geminiService';
import { CreateMode } from '../types';
import type { Source, XUserProfile } from '../types';
import TweetPreview from './TweetPreview';
import TextIcon from './icons/TextIcon';
import LinkIcon from './icons/LinkIcon';
import UploadIcon from './icons/UploadIcon';
import SparklesIcon from './icons/SparklesIcon';
import CameraIcon from './icons/CameraIcon';
import VideoIcon from './icons/VideoIcon';

const MAX_CHARS = 280;

const DEFAULT_USER: XUserProfile = {
  name: 'Preview User',
  handle: '@preview_user',
  avatarUrl: `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23657786'%3E%3Cpath d='M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z'/%3E%3C/svg%3E`,
  verified: false
};

const CreateTweet: React.FC = () => {
  const [createMode, setCreateMode] = useState<CreateMode>(CreateMode.Text);
  const [prompt, setPrompt] = useState('');
  const [audience, setAudience] = useState('');
  const [tweets, setTweets] = useState<string[]>(['']);
  const [media, setMedia] = useState<{ type: 'image' | 'video'; url: string } | null>(null);
  const [isLoading, setIsLoading] = useState<Record<string, boolean>>({});
  const [videoProgress, setVideoProgress] = useState('');
  
  const [linkUrl, setLinkUrl] = useState('');
  const [isFetchingLink, setIsFetchingLink] = useState(false);


  const handleTweetChange = (index: number, value: string) => {
    const newTweets = [...tweets];
    newTweets[index] = value;
    setTweets(newTweets);
  };

  const addTweetToThread = () => {
    setTweets([...tweets, '']);
  };

  const handleGenerate = useCallback(async (type: 'tweet' | 'thread') => {
    setIsLoading(prev => ({ ...prev, [type]: true }));
    let sourceToUse: Source | undefined = undefined;
    if (createMode === CreateMode.Link && linkUrl) {
        sourceToUse = { web: { uri: linkUrl, title: 'External Link' } };
    }
    const audienceToUse = audience.trim() || undefined;

    if (type === 'tweet') {
        const result = await generateTweet(prompt, sourceToUse, audienceToUse, undefined, undefined, undefined, undefined, undefined);
        setTweets([result]);
    } else {
        const results = await generateTweetThread(prompt, sourceToUse, audienceToUse, undefined, undefined, undefined, undefined, undefined);
        setTweets(results.length > 0 ? results : ['']);
    }
    setIsLoading(prev => ({ ...prev, [type]: false }));
  }, [prompt, createMode, audience, linkUrl]);

  const handleFetchLink = async () => {
      if (!linkUrl) return;
      setIsFetchingLink(true);
      const summary = await summarizeUrl(linkUrl);
      setPrompt(summary);
      setIsFetchingLink(false);
  }

  const handleGenerateMedia = useCallback(async (type: 'image' | 'video') => {
      setIsLoading(prev => ({ ...prev, [type]: true }));
      setMedia(null);
      setVideoProgress('');
      try {
          if (type === 'image') {
              const imageUrls = await generateImage(prompt);
              setMedia({ type: 'image', url: `data:image/jpeg;base64,${imageUrls[0]}` });
          } else {
              const videoUrl = await generateVideo(prompt, 'cinematic', setVideoProgress);
              setMedia({ type: 'video', url: videoUrl });
          }
      } catch (error) {
          console.error(`Error generating ${type}:`, error);
      }
      setIsLoading(prev => ({ ...prev, [type]: false }));
  }, [prompt]);

  const ModeButton: React.FC<{ mode: CreateMode; label: string; icon: React.ReactNode }> = ({ mode, label, icon }) => (
    <button
      onClick={() => {
          setCreateMode(mode);
          setLinkUrl('');
      }}
      className={`flex-1 p-3 flex items-center justify-center gap-2 rounded-t-lg transition-colors ${
        createMode === mode ? 'bg-bg-secondary text-accent-primary' : 'bg-transparent text-text-primary hover:bg-bg-primary/50'
      }`}
    >
      {icon} {label}
    </button>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-7xl mx-auto">
      {/* --- CREATION PANEL --- */}
      <div className="bg-bg-secondary p-6 rounded-xl border border-border-primary flex flex-col">
        <h1 className="text-2xl font-bold mb-4">Create a new Post</h1>
        <div className="flex border-b border-border-primary mb-4">
            <ModeButton mode={CreateMode.Text} label="Text" icon={<TextIcon />} />
            <ModeButton mode={CreateMode.Link} label="Link" icon={<LinkIcon />} />
            <ModeButton mode={CreateMode.File} label="File" icon={<UploadIcon />} />
        </div>

        <div className="flex-grow flex flex-col">
            {createMode === CreateMode.Link ? (
                <div className="mb-4">
                    <label htmlFor="linkUrl" className="text-sm font-semibold text-text-primary mb-2">
                        Enter a URL to summarize
                    </label>
                    <div className="flex gap-2">
                        <input
                            id="linkUrl"
                            type="url"
                            value={linkUrl}
                            onChange={(e) => setLinkUrl(e.target.value)}
                            placeholder="https://example.com/article"
                            className="flex-grow bg-bg-primary border border-border-primary rounded-lg p-3 focus:ring-2 focus:ring-accent-primary focus:shadow-glow-primary focus:outline-none transition"
                        />
                        <button onClick={handleFetchLink} disabled={isFetchingLink || !linkUrl} className="ai-button bg-green-600 hover:bg-green-700 px-4">
                            {isFetchingLink ? '...' : 'Fetch & Summarize'}
                        </button>
                    </div>
                </div>
            ) : null}

          <label htmlFor="prompt" className="text-sm font-semibold text-text-primary mb-2">
            What do you want to post about?
          </label>
          <textarea
            id="prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g., The future of space exploration with AI..."
            className="w-full bg-bg-primary border border-border-primary rounded-lg p-3 focus:ring-2 focus:ring-accent-primary focus:shadow-glow-primary focus:outline-none transition"
            rows={3}
          />
           <div className="my-2">
            <label htmlFor="audience" className="text-sm font-semibold text-text-primary mb-2">
              Target Audience (Optional)
            </label>
            <input
              type="text"
              id="audience"
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              placeholder="e.g., Software Developers, Digital Marketers..."
              className="w-full bg-bg-primary border border-border-primary rounded-lg p-3 focus:ring-2 focus:ring-accent-primary focus:shadow-glow-primary focus:outline-none transition"
            />
          </div>
                    
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 my-4">
              <button onClick={() => handleGenerate('tweet')} disabled={isLoading.tweet} className="ai-button">
                  <SparklesIcon /> {isLoading.tweet ? 'Generating...' : 'Generate Tweet'}
              </button>
              <button onClick={() => handleGenerate('thread')} disabled={isLoading.thread} className="ai-button">
                  <SparklesIcon /> {isLoading.thread ? 'Generating...' : 'Generate Thread'}
              </button>
              <button onClick={() => handleGenerateMedia('image')} disabled={isLoading.image} className="ai-button">
                  <CameraIcon /> {isLoading.image ? 'Generating...' : 'Generate Image'}
              </button>
              <button onClick={() => handleGenerateMedia('video')} disabled={isLoading.video} className="ai-button">
                  <VideoIcon /> {isLoading.video ? 'Generating...' : 'Generate Video'}
              </button>
          </div>

          <div className="space-y-4 flex-grow">
            {tweets.map((tweet, index) => (
              <div key={index} className="relative">
                <textarea
                  value={tweet}
                  onChange={(e) => handleTweetChange(index, e.target.value)}
                  placeholder={`Tweet ${index + 1}/${tweets.length}...`}
                  className="w-full bg-bg-primary border border-border-primary rounded-lg p-3 pr-16 focus:ring-2 focus:ring-accent-primary focus:shadow-glow-primary focus:outline-none transition"
                  rows={4}
                />
                <span className={`absolute bottom-3 right-3 text-sm ${tweet.length > MAX_CHARS ? 'text-danger' : 'text-text-secondary'}`}>
                  {tweet.length}/{MAX_CHARS}
                </span>
              </div>
            ))}
          </div>

          <button onClick={addTweetToThread} className="mt-4 text-accent-primary font-semibold hover:underline self-start">
            + Add to Thread
          </button>
        </div>
        
        <div className="flex gap-4 mt-6">
            <button className="flex-1 py-3 bg-transparent border border-accent-primary text-accent-primary rounded-full font-bold hover:bg-accent-primary/10 transition">Save Draft</button>
            <button className="flex-1 py-3 bg-accent-primary text-bg-primary rounded-full font-bold hover:opacity-90 transition">Post Now</button>
        </div>
      </div>

      {/* --- PREVIEW PANEL --- */}
      <div>
        <h2 className="text-xl font-bold mb-4">Preview</h2>
        <div className="space-y-4">
          {tweets.map((tweetContent, index) => (
            <TweetPreview 
              key={index}
              tweet={{
                id: `preview-${index}`,
                content: tweetContent,
                author: DEFAULT_USER,
                media: index === 0 ? media : undefined,
                stats: { likes: 0, retweets: 0, impressions: 0, replies: 0 },
                postedAt: new Date(),
              }} 
            />
          ))}
          {isLoading.video && videoProgress && (
            <div className="p-4 bg-bg-secondary rounded-lg border border-border-primary text-center text-text-primary">
              <p className="animate-pulse">{videoProgress}</p>
            </div>
          )}
        </div>
      </div>
       <style>{`
          .ai-button {
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 0.5rem;
              padding: 0.75rem;
              border-radius: 9999px;
              font-weight: bold;
              transition: all 0.2s;
              background-color: #3772FF;
              color: white;
              text-align: center;
              white-space: nowrap;
          }
          .ai-button:hover:not(:disabled) {
              opacity: 0.9;
          }
          .ai-button:disabled {
              opacity: 0.5;
              cursor: not-allowed;
          }
      `}</style>
    </div>
  );
};

export default CreateTweet;