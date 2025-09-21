
import React from 'react';
import TweetPreview from './TweetPreview';
import type { Tweet } from '../types';

const mockScheduledTweets: Tweet[] = [
  {
    id: 's1',
    content: "Scheduled post: What are the biggest ethical considerations for advanced AI? Let's discuss. #AIEthics #FutureOfAI",
    // FIX: Added missing 'verified' property to satisfy the XUserProfile type.
    author: { name: 'AI Content Wiz', handle: '@ai_wiz', avatarUrl: 'https://picsum.photos/seed/user/100/100', verified: false },
    stats: { likes: 0, retweets: 0, impressions: 0, replies: 0 },
    postedAt: new Date(), // placeholder
    scheduledAt: new Date(Date.now() + 3600 * 1000 * 4), // 4 hours from now
  },
  {
    id: 's2',
    content: "AI-generated art is reaching new heights. Here's a piece inspired by surrealism. What does it make you feel? #AIart #Surrealism",
    // FIX: Added missing 'verified' property to satisfy the XUserProfile type.
    author: { name: 'AI Content Wiz', handle: '@ai_wiz', avatarUrl: 'https://picsum.photos/seed/user/100/100', verified: false },
    media: { type: 'image', url: 'https://picsum.photos/seed/image-scheduled/600/400' },
    stats: { likes: 0, retweets: 0, impressions: 0, replies: 0 },
    postedAt: new Date(),
    scheduledAt: new Date(Date.now() + 3600 * 1000 * 24 * 2), // 2 days from now
  },
];

const Scheduler: React.FC = () => {
  return (
    <div className="animate-fade-in">
      <h1 className="text-3xl font-bold mb-2 text-accent-primary">Scheduled Posts</h1>
      <p className="text-text-secondary mb-8">Here are your posts waiting to be published.</p>

      <div className="space-y-6">
        {mockScheduledTweets.map(tweet => (
          <div key={tweet.id}>
             <div className="bg-accent-secondary/10 text-accent-secondary text-sm font-bold p-2 rounded-t-lg border-b border-accent-secondary/20">
                Scheduled for: {tweet.scheduledAt?.toLocaleString()}
             </div>
            <TweetPreview tweet={tweet} />
          </div>
        ))}
        {mockScheduledTweets.length === 0 && (
          <div className="text-center py-12 bg-bg-secondary rounded-lg border border-border-primary">
            <p className="text-text-secondary">You have no scheduled posts.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Scheduler;