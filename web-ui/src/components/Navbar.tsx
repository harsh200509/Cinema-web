import React, { useState } from 'react';
import { Film, Search, Sun, Moon } from 'lucide-react';

interface NavbarProps {
  currentTab: 'home' | 'movies' | 'tv';
  onTabChange: (tab: 'home' | 'movies' | 'tv') => void;
  onSearch: (query: string) => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ currentTab, onTabChange, onSearch, theme, onToggleTheme }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchQuery);
  };

  const handleNavClick = (tab: 'home' | 'movies' | 'tv') => {
    setSearchQuery('');
    onTabChange(tab);
  };

  return (
    <nav className="navbar">
      <div className="nav-container">
        {/* Left: Brand Logo */}
        <div className="nav-left">
          <div className="logo" onClick={() => handleNavClick('home')} style={{ cursor: 'pointer' }}>
            <Film className="logo-icon" size={26} />
            <span className="logo-text">CINEMA</span>
          </div>
        </div>

        {/* Center: Search Box */}
        <div className="nav-center">
          <form onSubmit={handleSearchSubmit} className="search-form">
            <input 
              type="text" 
              placeholder="Search movies, TV shows, actors..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            <button 
              type="submit" 
              className="search-submit-btn" 
              title="Search"
            >
              <Search size={17} />
            </button>
          </form>
        </div>

        {/* Right: Navigation Links & Theme Toggle */}
        <div className="nav-right">
          <div className="nav-links">
            <button 
              type="button"
              className={currentTab === 'home' ? 'active' : ''} 
              onClick={() => handleNavClick('home')}
            >
              Home
            </button>
            <button 
              type="button"
              className={currentTab === 'movies' ? 'active' : ''} 
              onClick={() => handleNavClick('movies')}
            >
              Movies
            </button>
            <button 
              type="button"
              className={currentTab === 'tv' ? 'active' : ''} 
              onClick={() => handleNavClick('tv')}
            >
              TV Shows
            </button>
          </div>

          <button 
            className="icon-btn" 
            onClick={onToggleTheme} 
            title={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
            aria-label="Toggle Theme"
          >
            {theme === 'dark' ? <Sun size={19} /> : <Moon size={19} />}
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
