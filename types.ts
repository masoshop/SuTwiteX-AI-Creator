

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
  scheduledAt?: Date;
  postedAt: Date;
}

export interface EditableTweet {
  id: string;
  content: string;
  media: { type: 'image' | 'video'; url: string; } | null;
  isLoadingMedia: boolean;
  isCopied: boolean;
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
    Proofread = 'proofread',
}

export interface Source {
  web: {
    uri: string;
    title: string;
    summary?: string;
  };
}

// FIX: Add BufferProfile interface, which was missing and causing compilation errors.
export interface BufferProfile {
  id: string;
  avatar: string;
  formatted_username: string;
  service: string;
}

// FIX: Add ViewType for sidebar navigation.
export type ViewType = 'dashboard' | 'create' | 'scheduler' | 'analytics';

// FIX: Add AnalyticsDataPoint for analytics charts.
export interface AnalyticsDataPoint {
  date: string;
  [key: string]: string | number;
}

export interface Draft {
  id: string;
  createdAt: string; // ISO string
  prompt: string;
  audience: string;
  createMode: CreateMode;
  tweets: EditableTweet[];
}
