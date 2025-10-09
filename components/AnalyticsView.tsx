import React, { useState, useMemo } from 'react';
import { searchXPosts } from '../services/geminiService';
import type { Tweet } from '../types';
import SearchIcon from './icons/SearchIcon';
import TweetPreview from './TweetPreview';
import XLogoIcon from './icons/XLogoIcon';

const AnalyticsView: React.FC = () => {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Tweet[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [sortBy, setSortBy] = useState<'relevant' | 'likes' | 'retweets'>('relevant');
  
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query) return;
    
    setSortBy('relevant');
    setIsLoading(true);
    setError(null);
    setSearchResults([]);
    setHasSearched(true);
    try {
        const results = await searchXPosts(query);
        // FIX: searchXPosts returns an object { tweets, sources }. We need to set the state with results.tweets.
        setSearchResults(results.tweets);
    } catch (err) {
        const message = err instanceof Error ? err.message : "An unknown error occurred.";
        setError(message);
    } finally {
        setIsLoading(false);
    }
  };

  const sortedResults = useMemo(() => {
    if (sortBy === 'relevant') {
        return searchResults;
    }
    return [...searchResults].sort((a, b) => {
        if (sortBy === 'likes') {
            return b.stats.likes - a.stats.likes;
        }
        if (sortBy === 'retweets') {
            return b.stats.retweets - a.stats.retweets;
        }
        return 0;
    });
  }, [searchResults, sortBy]);
  
  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="mt-8 space-y-4 animate-pulse">
            {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-bg-secondary border border-border-primary rounded-lg p-4 flex space-x-4">
                    <div className="h-12 w-12 rounded-full bg-border-primary flex-shrink-0"></div>
                    <div className="flex-1 space-y-3">
                        <div className="h-4 bg-border-primary rounded w-3/4"></div>
                        <div className="h-4 bg-border-primary rounded w-full"></div>
                        <div className="h-4 bg-border-primary rounded w-1/2"></div>
                    </div>
                </div>
            ))}
        </div>
      );
    }
     if (error) {
      return (
        <div className="bg-danger/20 border border-danger text-accent-secondary p-4 rounded-lg mt-8">
          <h2 className="font-bold">Error</h2>
          <p>{error}</p>
        </div>
      );
    }
    if (!hasSearched) {
        return (
            <div className="text-center mt-16">
                <XLogoIcon className="mx-auto h-16 w-16 text-border-primary"/>
                <p className="mt-4 text-lg text-text-secondary">
                    Search for posts on X by topic, hashtag, or user.
                </p>
            </div>
        )
    }
    
    if (searchResults.length === 0) {
        return (
            <div className="text-center mt-16">
                <p className="mt-4 text-lg text-text-primary">
                    No results found for "{query}". Try another search.
                </p>
            </div>
        )
    }

    const SortButton: React.FC<{ value: 'relevant' | 'likes' | 'retweets'; label: string }> = ({ value, label }) => (
      <button
        onClick={() => setSortBy(value)}
        className={`px-4 py-2 text-sm font-semibold rounded-full transition-colors ${
          sortBy === value
            ? 'bg-accent-primary text-bg-primary'
            : 'bg-bg-secondary hover:bg-bg-primary text-text-primary border border-border-primary'
        }`}
      >
        {label}
      </button>
    );

    return (
        <div className="mt-8 animate-fade-in">
             <h2 className="text-xl font-bold text-center mb-4">
                Showing results for <span className="text-accent-primary">"{query}"</span>
            </h2>
            <div className="flex justify-center items-center gap-2 mb-6 border-b border-border-primary pb-6">
                <span className="text-sm font-semibold text-text-secondary mr-2">Sort by:</span>
                <SortButton value="relevant" label="Most Relevant" />
                <SortButton value="likes" label="Most Likes" />
                <SortButton value="retweets" label="Most Retweets" />
            </div>
            <div className="space-y-4">
                {sortedResults.map(tweet => (
                    <TweetPreview key={tweet.id} tweet={tweet} />
                ))}
            </div>
        </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <h1 className="text-3xl font-bold mb-2 text-accent-primary">Topic Research</h1>
      <p className="text-text-secondary mb-8">Find inspiration by searching for posts on X by topic, hashtag, or user.</p>
      
        <form onSubmit={handleSearch} className="max-w-xl mx-auto flex gap-2 p-2 bg-bg-secondary/80 backdrop-blur-sm border border-border-primary rounded-full">
            <input 
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search X... (e.g., #AI, from:nasa, latest tech)"
                className="w-full bg-transparent focus:outline-none text-text-primary pl-4"
            />
            <button type="submit" disabled={isLoading || !query} className="bg-accent-primary text-bg-secondary rounded-full px-6 py-2 font-bold hover:opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                <SearchIcon />
                {isLoading ? 'Searching...' : 'Search'}
            </button>
        </form>

        {renderContent()}

    </div>
  );
};

export default AnalyticsView;
