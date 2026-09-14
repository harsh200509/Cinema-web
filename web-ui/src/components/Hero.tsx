import React from 'react';
import { Play, Download } from 'lucide-react';

interface Movie {
  id: string;
  provider: string;
  title: string;
  img: string;
}

interface HeroProps {
  movie: Movie | null;
  onMovieClick: (movie: Movie) => void;
}

const Hero: React.FC<HeroProps> = ({ movie, onMovieClick }) => {
  if (!movie) return null;

  return (
    <header className="hero">
      <div className="hero-backdrop">
        <img 
          src={movie.img} 
          alt={movie.title} 
        />
        <div className="hero-overlay"></div>
        <div className="hero-vignette"></div>
      </div>
      
      <div className="hero-content">
        <span className="hero-tag">#1 Trending Today</span>
        <h1 className="hero-title">{movie.title}</h1>
        
        <div className="hero-buttons">
          <button className="btn-primary lg" onClick={() => onMovieClick(movie)}>
            <Play size={18} fill="currentColor" /> Stream Now
          </button>
          <button className="btn-secondary lg" onClick={() => onMovieClick(movie)}>
            <Download size={18} /> Download
          </button>
        </div>
      </div>
    </header>
  );
};

export default Hero;
