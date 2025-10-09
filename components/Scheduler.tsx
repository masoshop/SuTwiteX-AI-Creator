
import React from 'react';
import TweetPreview from './TweetPreview';
import type { Tweet } from '../types';

const mockScheduledTweets: Tweet[] = [
  {
    id: 's1',
    content: "Publicación programada: ¿Cuáles son las mayores consideraciones éticas para la IA avanzada? Discutamos. #ÉticaIA #FuturoDeLaIA",
    // FIX: Added missing 'verified' property to satisfy the XUserProfile type.
    author: { name: 'AI Content Wiz', handle: '@ai_wiz', avatarUrl: 'https://picsum.photos/seed/user/100/100', verified: false },
    stats: { likes: 0, retweets: 0, impressions: 0, replies: 0 },
    postedAt: new Date(), // placeholder
    scheduledAt: new Date(Date.now() + 3600 * 1000 * 4), // 4 hours from now
  },
  {
    id: 's2',
    content: "El arte generado por IA está alcanzando nuevas cotas. Aquí una pieza inspirada en el surrealismo. ¿Qué te hace sentir? #ArteIA #Surrealismo",
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
      <h1 className="text-3xl font-bold mb-2 text-accent-primary">Publicaciones Programadas</h1>
      <p className="text-text-secondary mb-8">Aquí están tus publicaciones esperando a ser publicadas.</p>

      <div className="space-y-6">
        {mockScheduledTweets.map(tweet => (
          <div key={tweet.id}>
             <div className="bg-accent-secondary/10 text-accent-secondary text-sm font-bold p-2 rounded-t-lg border-b border-accent-secondary/20">
                Programado para: {tweet.scheduledAt?.toLocaleString()}
             </div>
            <TweetPreview tweet={tweet} />
          </div>
        ))}
        {mockScheduledTweets.length === 0 && (
          <div className="text-center py-12 bg-bg-secondary rounded-lg border border-border-primary">
            <p className="text-text-secondary">No tienes publicaciones programadas.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Scheduler;