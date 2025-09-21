
import React from 'react';
import type { Tweet } from '../types';
import DownloadIcon from './icons/DownloadIcon';
import VerifiedIcon from './icons/VerifiedIcon';

const TweetPreview: React.FC<{ tweet: Tweet }> = ({ tweet }) => {
  return (
    <div className="bg-bg-secondary border border-border-primary rounded-lg p-4 flex space-x-4 transition-all hover:border-accent-primary/50">
      <img src={tweet.author.avatarUrl} alt="Author Avatar" className="h-12 w-12 rounded-full flex-shrink-0" />
      <div className="flex-1">
        <div className="flex items-center space-x-1">
          <p className="font-bold">{tweet.author.name}</p>
          {tweet.author.verified && <VerifiedIcon />}
          <p className="text-text-secondary">{tweet.author.handle}</p>
          <span className="text-text-secondary">·</span>
          <p className="text-text-secondary text-sm">
            {tweet.postedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <p className="mt-1 whitespace-pre-wrap text-text-primary">{tweet.content}</p>

        {tweet.media && (
          <div className="relative group mt-3 rounded-2xl overflow-hidden border border-border-primary">
            {tweet.media.type === 'image' ? (
              <img src={tweet.media.url} alt="Tweet media" className="w-full h-auto object-cover" />
            ) : (
              <video src={tweet.media.url} controls className="w-full h-auto" />
            )}
            <a
              href={tweet.media.url}
              download={`generated-media.${tweet.media.type === 'image' ? 'jpeg' : 'mp4'}`}
              className="absolute top-2 right-2 bg-black/60 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
              aria-label="Download media"
              title="Download"
            >
              <DownloadIcon className="h-5 w-5" />
            </a>
          </div>
        )}

        <div className="flex justify-between text-text-secondary mt-4 max-w-sm">
          <button className="flex items-center space-x-2 hover:text-accent-primary">
            <span>💬</span> <span>{tweet.stats.replies}</span>
          </button>
          <button className="flex items-center space-x-2 hover:text-green-500">
            <span>🔁</span> <span>{tweet.stats.retweets}</span>
          </button>
          <button className="flex items-center space-x-2 hover:text-red-500">
            <span>❤️</span> <span>{tweet.stats.likes}</span>
          </button>
          <button className="flex items-center space-x-2 hover:text-accent-primary">
             <span>📊</span> <span>{tweet.stats.impressions.toLocaleString()}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default TweetPreview;