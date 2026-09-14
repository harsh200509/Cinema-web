import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Movie {
  id: string;
  provider: string;
  title: string;
  img: string;
}

interface CarouselProps {
  title: string;
  viewAll?: boolean;
  movies: Movie[];
  onMovieClick?: (movie: Movie) => void;
}

const Carousel: React.FC<CarouselProps> = ({ title, viewAll, movies, onMovieClick }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const { scrollLeft, clientWidth } = scrollRef.current;
      const scrollTo = direction === 'left' ? scrollLeft - clientWidth + 100 : scrollLeft + clientWidth - 100;
      scrollRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
    }
  };

  return (
    <section className="content-row">
      <div className="section-header">
        <h2>{title}</h2>
        {viewAll && <a href="#" className="view-all">View All →</a>}
      </div>
      <div className="carousel-container">
        <button 
          className="icon-btn carousel-btn prev" 
          onClick={() => scroll('left')}
          style={{ position: 'absolute', left: '-20px', top: '50%', transform: 'translateY(-50%)', zIndex: 10, background: 'var(--bg-surface)' }}
        >
          <ChevronLeft size={24} />
        </button>
        
        <div className="carousel-track" ref={scrollRef}>
          {movies.map((movie, index) => (
            <div 
                className="movie-card" 
                key={index} 
                onClick={() => onMovieClick && onMovieClick(movie)}
                style={{ cursor: onMovieClick ? 'pointer' : 'default' }}
            >
              <img src={movie.img} alt={movie.title} loading="lazy" />
              <div className="movie-card-overlay">
                <p className="movie-title">{movie.title}</p>
              </div>
            </div>
          ))}
        </div>
        
        <button 
          className="icon-btn carousel-btn next" 
          onClick={() => scroll('right')}
          style={{ position: 'absolute', right: '-20px', top: '50%', transform: 'translateY(-50%)', zIndex: 10, background: 'var(--bg-surface)' }}
        >
          <ChevronRight size={24} />
        </button>
      </div>
    </section>
  );
};

export default Carousel;
