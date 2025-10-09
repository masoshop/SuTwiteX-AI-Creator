import React, { useState, useMemo } from 'react';
import { searchXPosts, getTrendingTopics } from '../services/geminiService';
import type { Tweet, TrendingTopic, Source } from '../types';
import SearchIcon from './icons/SearchIcon';
import TweetPreview from './TweetPreview';
import XLogoIcon from './icons/XLogoIcon';
import SparklesIcon from './icons/SparklesIcon';
import LoaderIcon from './icons/LoaderIcon';

const Analytics: React.FC = () => {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Tweet[]>([]);
  const [searchSources, setSearchSources] = useState<Source[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [sortBy, setSortBy] = useState<'relevant' | 'likes' | 'retweets'>('relevant');
  
  const [trends, setTrends] = useState<TrendingTopic[]>([]);
  const [trendsSources, setTrendsSources] = useState<Source[]>([]);
  const [isTrendsLoading, setIsTrendsLoading] = useState(false);
  const [trendsError, setTrendsError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query) return;
    
    setSortBy('relevant');
    setIsLoading(true);
    setError(null);
    setSearchResults([]);
    setSearchSources([]);
    setHasSearched(true);
    try {
        const results = await searchXPosts(query);
        setSearchResults(results.tweets);
        setSearchSources(results.sources);
    } catch (err) {
        const message = err instanceof Error ? err.message : "Ocurrió un error desconocido.";
        setError(message);
    } finally {
        setIsLoading(false);
    }
  };
  
  const handleFetchTrends = async () => {
    setIsTrendsLoading(true);
    setTrendsError(null);
    setTrendsSources([]);
    try {
      const results = await getTrendingTopics();
      setTrends(results.trends);
      setTrendsSources(results.sources);
      if (results.trends.length === 0) {
        setTrendsError("No se pudieron encontrar temas de tendencia en este momento. Por favor, inténtalo de nuevo más tarde.");
      }
    } catch (err) {
      setTrendsError(err instanceof Error ? err.message : "No se pudieron obtener las tendencias.");
    } finally {
      setIsTrendsLoading(false);
    }
  };
  
  const handleTrendClick = (topic: string) => {
    setQuery(topic);
    const syntheticEvent = {
      preventDefault: () => {},
    } as React.FormEvent;
    handleSearch(syntheticEvent);
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
  
  const renderTrendsSection = () => {
    if (isTrendsLoading) {
      return (
        <div className="text-center p-8">
          <LoaderIcon className="h-8 w-8 mx-auto text-accent-primary" />
          <p className="mt-2 text-text-secondary">Buscando tendencias...</p>
        </div>
      );
    }

    if (trendsError) {
      return (
        <div className="bg-danger/20 border border-danger text-accent-secondary p-4 rounded-lg mt-4 text-center">
          <p>{trendsError}</p>
        </div>
      );
    }

    if (trends.length > 0) {
      return (
        <div className="mt-6 animate-fade-in">
          <h3 className="text-lg font-bold text-center text-text-primary mb-4">Tendencias en X</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {trends.map((trend) => (
              <div key={trend.topic} className="bg-bg-secondary border border-border-primary p-4 rounded-lg flex flex-col justify-between">
                <div>
                  <h4 className="font-bold text-accent-primary">{trend.topic}</h4>
                  <p className="text-sm text-text-secondary mt-1">{trend.description}</p>
                </div>
                <button
                  onClick={() => handleTrendClick(trend.topic)}
                  className="mt-4 text-sm font-semibold text-accent-primary hover:underline self-start"
                >
                  Buscar este tema →
                </button>
              </div>
            ))}
          </div>
           {trendsSources.length > 0 && (
            <div className="mt-6 border-t border-border-primary pt-4">
                <h4 className="text-sm font-semibold text-text-secondary text-center mb-2">Fuentes de Búsqueda de Google</h4>
                <ul className="text-center space-y-1">
                    {trendsSources.map((source, index) => (
                        <li key={index}>
                            <a href={source.web.uri} target="_blank" rel="noopener noreferrer" className="text-xs text-accent-primary hover:underline truncate">
                                {source.web.title || source.web.uri}
                            </a>
                        </li>
                    ))}
                </ul>
            </div>
        )}
        </div>
      );
    }

    return (
      <div className="text-center mt-6">
        <button onClick={handleFetchTrends} className="ai-button bg-accent-secondary text-black">
          <SparklesIcon /> Descubrir Tendencias
        </button>
      </div>
    );
  };

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
                    Busca publicaciones en X por tema, hashtag o usuario.
                </p>
            </div>
        )
    }
    
    if (searchResults.length === 0) {
        return (
            <div className="text-center mt-16">
                <p className="mt-4 text-lg text-text-primary">
                    No se encontraron resultados para "{query}". Prueba con otra búsqueda.
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
                Mostrando resultados para <span className="text-accent-primary">"{query}"</span>
            </h2>
            <div className="flex justify-center items-center gap-2 mb-6 border-b border-border-primary pb-6">
                <span className="text-sm font-semibold text-text-secondary mr-2">Ordenar por:</span>
                <SortButton value="relevant" label="Más Relevantes" />
                <SortButton value="likes" label="Más Me Gusta" />
                <SortButton value="retweets" label="Más Retuits" />
            </div>
            <div className="space-y-4">
                {sortedResults.map(tweet => (
                    <TweetPreview key={tweet.id} tweet={tweet} />
                ))}
            </div>
            {searchSources.length > 0 && (
            <div className="mt-8 border-t border-border-primary pt-6">
                <h4 className="text-md font-bold text-text-primary text-center mb-3">Fuentes Utilizadas</h4>
                <div className="max-w-lg mx-auto space-y-2">
                    {searchSources.map((source, index) => (
                        <a key={index} href={source.web.uri} target="_blank" rel="noopener noreferrer" className="block p-3 bg-bg-primary border border-border-primary rounded-lg hover:bg-border-primary/50 transition-colors">
                            <p className="font-semibold text-accent-primary truncate">{source.web.title || source.web.uri}</p>
                            <p className="text-xs text-text-secondary truncate">{source.web.uri}</p>
                        </a>
                    ))}
                </div>
            </div>
        )}
        </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <h1 className="text-3xl font-bold mb-2 text-accent-primary">Búsqueda y Descubrimiento en X</h1>
      <p className="text-text-secondary mb-8">Encuentra publicaciones recientes o descubre qué es tendencia actualmente en X.</p>
      
        <form onSubmit={handleSearch} className="max-w-xl mx-auto flex gap-2 p-2 bg-bg-secondary/80 backdrop-blur-sm border border-border-primary rounded-full">
            <input 
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar en X... (ej: #IA, from:nasa, tecnología)"
                className="w-full bg-transparent focus:outline-none text-text-primary pl-4"
            />
            <button type="submit" disabled={isLoading || !query} className="bg-accent-primary text-bg-secondary rounded-full px-6 py-2 font-bold hover:opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                <SearchIcon />
                {isLoading ? 'Buscando...' : 'Buscar'}
            </button>
        </form>

        <div className="my-8 border-b border-border-primary pb-8">
            {renderTrendsSection()}
        </div>

        {renderContent()}

        <style>{`
          .ai-button {
              display: inline-flex;
              align-items: center;
              justify-content: center;
              gap: 0.5rem;
              padding: 0.75rem 1.25rem;
              border-radius: 9999px;
              font-weight: bold;
              transition: all 0.2s;
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

export default Analytics;