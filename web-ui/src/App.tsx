import React, { useState, useEffect, useMemo } from 'react';
import Navbar from './components/Navbar';
import Carousel from './components/Carousel';
import Footer from './components/Footer';
import DetailsModal from './components/DetailsModal';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import './App.css';

interface CatalogItem {
  id: { provider: string; value: string };
  title: string;
  media_type: string;
  year?: string;
  poster_url?: string;
}

interface Movie {
  id: string;
  provider: string;
  title: string;
  img: string;
  year?: string;
}

const PAGE_SIZE = 18;

const getApiBase = () => {
  if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    return 'http://127.0.0.1:8000';
  }
  return 'https://cinema-web-q3y3.onrender.com';
};

const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<'home' | 'movies' | 'tv'>('home');
  const [trendingMovies, setTrendingMovies] = useState<Movie[]>([]);
  const [topRatedShows, setTopRatedShows] = useState<Movie[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Pagination
  const [moviePage, setMoviePage] = useState<number>(1);
  const [tvPage, setTvPage] = useState<number>(1);
  const [isPaginating, setIsPaginating] = useState<boolean>(false);

  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [searchResults, setSearchResults] = useState<Movie[] | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Category filter for Movies / TV views
  const [movieFilter, setMovieFilter] = useState<'all' | 'hindi' | 'english'>('all');
  const [tvFilter, setTvFilter] = useState<'all' | 'hindi' | 'english'>('all');

  // Light / Dark mode theme
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('cinema_theme') as 'dark' | 'light') || 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('cinema_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
        setSearchResults(null);
        return;
    }
    setIsLoading(true);
    try {
        const res = await fetch(`${getApiBase()}/api/search?q=${encodeURIComponent(query)}`);
        if (res.ok) {
            const data = await res.json();
            const items: CatalogItem[] = data.items || [];
            setSearchResults(items.map(item => ({
                id: item.id.value,
                provider: item.id.provider,
                title: item.title,
                year: item.year,
                img: item.poster_url || "https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=300&q=80"
            })));
        }
    } catch (e) {
        console.error(e);
    }
    setIsLoading(false);
  };

  const handleTabChange = (tab: 'home' | 'movies' | 'tv') => {
    setCurrentTab(tab);
    setSearchResults(null);
    setSearchQuery('');
    setMovieFilter('all');
    setTvFilter('all');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Initial load
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [moviesRes, showsRes] = await Promise.all([
          fetch(`${getApiBase()}/api/homepage?tab=1&page=1`),
          fetch(`${getApiBase()}/api/homepage?tab=2&page=1`)
        ]);
        
        if (moviesRes.ok) {
          const data = await moviesRes.json();
          const items: CatalogItem[] = data.items || [];
          setTrendingMovies(items.map(item => ({
            id: item.id.value,
            provider: item.id.provider,
            title: item.title,
            year: item.year,
            img: item.poster_url || "https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=300&q=80"
          })));
        }

        if (showsRes.ok) {
          const data = await showsRes.json();
          const items: CatalogItem[] = data.items || [];
          setTopRatedShows(items.map(item => ({
            id: item.id.value,
            provider: item.id.provider,
            title: item.title,
            year: item.year,
            img: item.poster_url || "https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=300&q=80"
          })));
        }
      } catch (e) {
        console.error("Failed to fetch from backend", e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Fetch paginated movies
  const changeMoviePage = async (newPage: number) => {
    if (newPage < 1) return;
    setIsPaginating(true);
    try {
      const res = await fetch(`${getApiBase()}/api/homepage?tab=1&page=${newPage}`);
      if (res.ok) {
        const data = await res.json();
        const items: CatalogItem[] = data.items || [];
        if (items.length > 0) {
          setTrendingMovies(items.map(item => ({
            id: item.id.value,
            provider: item.id.provider,
            title: item.title,
            year: item.year,
            img: item.poster_url || "https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=300&q=80"
          })));
          setMoviePage(newPage);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }
    } catch (e) {
      console.error(e);
    }
    setIsPaginating(false);
  };

  // Fetch paginated TV shows
  const changeTvPage = async (newPage: number) => {
    if (newPage < 1) return;
    setIsPaginating(true);
    try {
      const res = await fetch(`${getApiBase()}/api/homepage?tab=2&page=${newPage}`);
      if (res.ok) {
        const data = await res.json();
        const items: CatalogItem[] = data.items || [];
        if (items.length > 0) {
          setTopRatedShows(items.map(item => ({
            id: item.id.value,
            provider: item.id.provider,
            title: item.title,
            year: item.year,
            img: item.poster_url || "https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=300&q=80"
          })));
          setTvPage(newPage);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }
    } catch (e) {
      console.error(e);
    }
    setIsPaginating(false);
  };

  // Categorized lists
  const hindiMovies = useMemo(() => {
    return trendingMovies.filter(m => /\[hindi\]|hindi|bolly/i.test(m.title));
  }, [trendingMovies]);

  const hollywoodMovies = useMemo(() => {
    return trendingMovies.filter(m => !/\[hindi\]|hindi|bolly/i.test(m.title));
  }, [trendingMovies]);

  // Filtered lists for Grid view
  const filteredMovies = useMemo(() => {
    let list = trendingMovies;
    if (movieFilter === 'hindi') list = hindiMovies;
    if (movieFilter === 'english') list = hollywoodMovies;
    return list.slice(0, PAGE_SIZE);
  }, [movieFilter, hindiMovies, hollywoodMovies, trendingMovies]);

  const filteredShows = useMemo(() => {
    let list = topRatedShows;
    if (tvFilter === 'hindi') list = topRatedShows.filter(s => /\[hindi\]|hindi/i.test(s.title));
    if (tvFilter === 'english') list = topRatedShows.filter(s => !/\[hindi\]|hindi/i.test(s.title));
    return list.slice(0, PAGE_SIZE);
  }, [tvFilter, topRatedShows]);

  const renderCardGrid = (items: Movie[], title: string, page: number, onPrev: () => void, onNext: () => void, showPagination: boolean = true) => (
    <div className="card-grid-container" style={{ padding: '1rem 0 3rem' }}>
      <div className="section-header" style={{ marginBottom: '1.5rem' }}>
        <h2>{title}</h2>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Showing {items.length} titles</span>
      </div>
      
      {isPaginating ? (
        <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading page...</div>
      ) : (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', 
          gap: '1.5rem' 
        }}>
          {items.map((item, idx) => (
            <div 
              key={idx}
              className="movie-card" 
              onClick={() => setSelectedMovie(item)}
              style={{ cursor: 'pointer' }}
            >
              <img src={item.img} alt={item.title} loading="lazy" />
              <div className="movie-card-overlay">
                <p className="movie-card-title">{item.title}</p>
                {item.year && <span style={{ fontSize: '0.75rem', color: 'var(--primary)' }}>{item.year}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {showPagination && (
        <div className="pagination-bar" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '2.5rem' }}>
          <button 
            className="btn-secondary btn-sm" 
            onClick={onPrev} 
            disabled={page <= 1 || isPaginating}
            style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}
          >
            <ChevronLeft size={16} /> Previous
          </button>
          <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 500 }}>
            Page {page}
          </span>
          <button 
            className="btn-secondary btn-sm" 
            onClick={onNext} 
            disabled={isPaginating}
            style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}
          >
            Next <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );

  return (
    <>
      <Navbar 
        currentTab={currentTab} 
        onTabChange={handleTabChange} 
        onSearch={handleSearch} 
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      <main style={{ marginTop: '80px', minHeight: '80vh' }}>
        {isLoading ? (
          <div style={{ padding: '6rem 2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <div style={{
              width: '40px',
              height: '40px',
              border: '3px solid rgba(255,255,255,0.1)',
              borderTopColor: 'var(--primary)',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
              margin: '0 auto 1.5rem'
            }}></div>
            <p>Loading media catalog...</p>
          </div>
        ) : searchResults ? (
          renderCardGrid(searchResults, `Search Results for "${searchQuery}"`, 1, () => {}, () => {}, false)
        ) : currentTab === 'movies' ? (
          <>
            {/* Category Filter Pills */}
            <div className="category-pills" style={{ display: 'flex', gap: '0.75rem', margin: '1rem 0 1.5rem', flexWrap: 'wrap' }}>
              <button 
                className={`btn-secondary btn-sm ${movieFilter === 'all' ? 'active-pill' : ''}`}
                onClick={() => setMovieFilter('all')}
                style={{ borderRadius: '100px', padding: '0.4rem 1.1rem' }}
              >
                All Movies
              </button>
              <button 
                className={`btn-secondary btn-sm ${movieFilter === 'hindi' ? 'active-pill' : ''}`}
                onClick={() => setMovieFilter('hindi')}
                style={{ borderRadius: '100px', padding: '0.4rem 1.1rem' }}
              >
                Bollywood & Hindi
              </button>
              <button 
                className={`btn-secondary btn-sm ${movieFilter === 'english' ? 'active-pill' : ''}`}
                onClick={() => setMovieFilter('english')}
                style={{ borderRadius: '100px', padding: '0.4rem 1.1rem' }}
              >
                Hollywood & Global
              </button>
            </div>
            {renderCardGrid(
              filteredMovies, 
              movieFilter === 'all' ? 'All Movies' : movieFilter === 'hindi' ? 'Bollywood & Hindi Movies' : 'Hollywood & Global Movies',
              moviePage,
              () => changeMoviePage(moviePage - 1),
              () => changeMoviePage(moviePage + 1)
            )}
          </>
        ) : currentTab === 'tv' ? (
          <>
            <div className="category-pills" style={{ display: 'flex', gap: '0.75rem', margin: '1rem 0 1.5rem', flexWrap: 'wrap' }}>
              <button 
                className={`btn-secondary btn-sm ${tvFilter === 'all' ? 'active-pill' : ''}`}
                onClick={() => setTvFilter('all')}
                style={{ borderRadius: '100px', padding: '0.4rem 1.1rem' }}
              >
                All Series
              </button>
              <button 
                className={`btn-secondary btn-sm ${tvFilter === 'hindi' ? 'active-pill' : ''}`}
                onClick={() => setTvFilter('hindi')}
                style={{ borderRadius: '100px', padding: '0.4rem 1.1rem' }}
              >
                Hindi Series
              </button>
              <button 
                className={`btn-secondary btn-sm ${tvFilter === 'english' ? 'active-pill' : ''}`}
                onClick={() => setTvFilter('english')}
                style={{ borderRadius: '100px', padding: '0.4rem 1.1rem' }}
              >
                International Series
              </button>
            </div>
            {renderCardGrid(
              filteredShows, 
              tvFilter === 'all' ? 'All TV Shows & Web Series' : tvFilter === 'hindi' ? 'Hindi Web Series' : 'International TV Shows',
              tvPage,
              () => changeTvPage(tvPage - 1),
              () => changeTvPage(tvPage + 1)
            )}
          </>
        ) : (
          <>
            <Carousel 
              title="Trending Movies" 
              viewAll={true} 
              movies={trendingMovies.slice(0, 16)} 
              onMovieClick={setSelectedMovie} 
            />
            <Carousel 
              title="Popular TV Shows & Series" 
              viewAll={false} 
              movies={topRatedShows.slice(0, 16)} 
              onMovieClick={setSelectedMovie} 
            />
            {hindiMovies.length > 0 && (
              <Carousel 
                title="Bollywood & Hindi Hits" 
                viewAll={false} 
                movies={hindiMovies.slice(0, 16)} 
                onMovieClick={setSelectedMovie} 
              />
            )}
            {hollywoodMovies.length > 0 && (
              <Carousel 
                title="Hollywood & International Movies" 
                viewAll={false} 
                movies={hollywoodMovies.slice(0, 16)} 
                onMovieClick={setSelectedMovie} 
              />
            )}
          </>
        )}
      </main>

      <Footer />

      <DetailsModal 
        isOpen={!!selectedMovie} 
        onClose={() => setSelectedMovie(null)} 
        movieId={selectedMovie?.id || null} 
        provider={selectedMovie?.provider || "moviebox"} 
      />
    </>
  );
};

export default App;
