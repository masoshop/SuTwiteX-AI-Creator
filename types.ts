
import React from 'react';

declare global {
  interface Window {
    aistudio: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

export interface EditableTweet {
  id:string;
  content: string;
  media: { type: 'image' | 'video'; url: string; } | null;
  isLoadingMedia: boolean;
  isCopied: boolean;
  isRegenerating?: boolean;
}

export interface XUserProfile {
  id: string;
  name: string;
  handle: string;
  avatarUrl: string;
  verified: boolean;
  public_metrics?: {
    followers_count: number;
    following_count: number;
    tweet_count: number;
    listed_count: number;
  };
}

export enum CreateMode {
    Text = 'text',
    Link = 'link',
    File = 'file',
    WebSearch = 'web_search',
    Proofread = 'proofread',
}

export type ActiveView = 'content' | 'multimedia';

export interface Source {
  web: {
    uri: string;
    title: string;
    summary?: string;
  };
}

export interface BrandVoiceProfile {
  toneAndStyle: string;
  keyTopics: string;
  topicsToAvoid: string;
}

export interface ChatMessage {
  author: 'user' | 'ai';
  content: string;
  sources?: Source[];
}

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  timestamp: number;
}

export interface Tweet {
  id: string;
  content: string;
  author: XUserProfile;
  media?: {
    type: 'image' | 'video';
    url: string;
  };
  public_metrics: {
    retweet_count: number;
    reply_count: number;
    like_count: number;
    quote_count: number;
    impression_count: number; 
  };
  created_at: string; // ISO Date string
  scheduledAt?: Date;
}

export interface Asset {
  id: string;
  name: string;
  type: 'image' | 'video' | 'document';
  mimeType: string;
  dataUrl: string; // Base64 data URL
  timestamp: number;
}

export interface TrendingTopic {
  name: string;
  query: string;
  volume?: number;
}

export interface BufferProfile {
  id: string;
  avatar: string;
  formatted_username: string;
  service: string;
}
