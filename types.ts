

export interface EditableTweet {
  id:string;
  content: string;
  media: { type: 'image' | 'video'; url: string; } | null;
  isLoadingMedia: boolean;
  isCopied: boolean;
  isRegenerating?: boolean;
}

export interface XUserProfile {
  name: string;
  handle: string;
  avatarUrl: string;
  verified: boolean;
}

export enum CreateMode {
    Text = 'text',
    Link = 'link',
    File = 'file',
    WebSearch = 'web_search',
    Proofread = 'proofread',
}

export interface Source {
  web: {
    uri: string;
    title: string;
    summary?: string;
  };
}

export interface Draft {
  id: string;
  createdAt: string; // ISO string
  prompt: string;
  audience: string;
  createMode: CreateMode;
  tweets: EditableTweet[];
}

export interface BrandVoiceProfile {
  toneAndStyle: string;
  targetAudience: string;
  keyTopics: string;
  topicsToAvoid: string;
}

export interface ChatMessage {
  author: 'user' | 'ai';
  content: string;
}

// FIX: Added missing Tweet interface required by Scheduler, Analytics, and TweetPreview components.
export interface Tweet {
  id: string;
  content: string;
  author: XUserProfile;
  media?: {
    type: 'image' | 'video';
    url: string;
  };
  stats: {
    likes: number;
    retweets: number;
    impressions: number;
    replies: number;
  };
  postedAt: Date;
  scheduledAt?: Date;
}

// FIX: Added missing AnalyticsDataPoint interface required by xService.
export interface AnalyticsDataPoint {
  date: string;
  value?: number;
  [key: string]: any;
}

// FIX: Added missing BufferProfile interface required by bufferService and BufferModal.
export interface BufferProfile {
  id: string;
  avatar: string;
  formatted_username: string;
  service: string;
}

export interface TrendingTopic {
  topic: string;
  description: string;
}