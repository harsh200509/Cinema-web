import React, { useState, useEffect } from 'react';
import { X, Play, Download, Copy, Check, Star, Calendar, Clock, Film, FileVideo, AlertCircle, Headphones, Subtitles } from 'lucide-react';
import './DetailsModal.css';

interface DetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  movieId: string | null;
  provider: string;
}

const formatBytes = (bytes?: number): string => {
  if (!bytes || bytes === 0) return '';
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1) return `${gb.toFixed(1)} GB`;
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(0)} MB`;
};

const getApiBase = () => {
  if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    return 'http://127.0.0.1:8000';
  }
  return 'https://cinema-web-q3y3.onrender.com';
};

const DetailsModal: React.FC<DetailsModalProps> = ({ isOpen, onClose, movieId, provider }) => {
  const [details, setDetails] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streams, setStreams] = useState<any[]>([]);
  const [loadingStreams, setLoadingStreams] = useState(false);
  
  const [selectedSeason, setSelectedSeason] = useState<number>(1);
  const [selectedEpisode, setSelectedEpisode] = useState<number>(1);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [playbackStatus, setPlaybackStatus] = useState<string | null>(null);
  const [playingStreamUrl, setPlayingStreamUrl] = useState<string | null>(null);

  // Audio track & Subtitles
  const [activeSubjectId, setActiveSubjectId] = useState<string>(movieId || '');
  const [subtitles, setSubtitles] = useState<{ name: string; url: string }[]>([]);
  const [selectedSubtitle, setSelectedSubtitle] = useState<string>('');

  // Players
  const [availablePlayers, setAvailablePlayers] = useState<string[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<string>('mpv');

  // Check available players
  useEffect(() => {
    fetch(`${getApiBase()}/api/players`)
      .then(res => res.json())
      .then(data => {
        if (data.players && Array.isArray(data.players)) {
          setAvailablePlayers(data.players);
          if (data.players.length > 0) {
            setSelectedPlayer(data.players[0].toLowerCase());
          }
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (isOpen && movieId) {
      setLoading(true);
      setError(null);
      setDetails(null);
      setStreams([]);
      setSubtitles([]);
      setSelectedSubtitle('');
      setPlaybackStatus(null);
      setActiveSubjectId(movieId);

      fetch(`${getApiBase()}/api/details?id=${movieId}&provider=${provider}`)
        .then(res => {
          if (!res.ok) throw new Error("Failed to fetch media details");
          return res.json();
        })
        .then(data => {
            setDetails(data);
            setLoading(false);
            if (!data.seasons || data.seasons.length === 0) {
               fetchStreams(movieId, provider, 0, 0);
            } else {
               const firstSeason = data.seasons[0]?.number || 1;
               const firstEpisode = data.seasons[0]?.episodes?.[0]?.number || 1;
               setSelectedSeason(firstSeason);
               setSelectedEpisode(firstEpisode);
               fetchStreams(movieId, provider, firstSeason, firstEpisode);
            }
        })
        .catch(err => {
            console.error(err);
            setError("Could not load details for this title.");
            setLoading(false);
        });
    }
  }, [isOpen, movieId, provider]);

  const fetchStreams = (id: string, prov: string, season: number, episode: number) => {
      setLoadingStreams(true);
      setStreams([]);
      setSubtitles([]);
      setSelectedSubtitle('');

      fetch(`${getApiBase()}/api/streams?id=${id}&provider=${prov}&season=${season}&episode=${episode}`)
        .then(res => {
            if (!res.ok) throw new Error("Failed to fetch streams");
            return res.json();
        })
        .then(data => {
            const list = Array.isArray(data) ? data : [];
            setStreams(list);
            setLoadingStreams(false);

            // Fetch subtitles if resource_id is available
            const resId = list[0]?.resource_id || '';
            fetch(`${getApiBase()}/api/subtitles?id=${id}&resource_id=${resId}`)
              .then(sRes => sRes.json())
              .then(subs => {
                if (Array.isArray(subs) && subs.length > 0) {
                  setSubtitles(subs);
                }
              })
              .catch(() => {});
        })
        .catch(err => {
            console.error("Stream fetch error:", err);
            setLoadingStreams(false);
        });
  };

  const handleAudioChange = (newSubjectId: string) => {
      setActiveSubjectId(newSubjectId);
      const s = (!details?.seasons || details.seasons.length === 0) ? 0 : selectedSeason;
      const ep = (!details?.seasons || details.seasons.length === 0) ? 0 : selectedEpisode;
      fetchStreams(newSubjectId, provider, s, ep);
  };

  const handleSeasonChange = (s: number) => {
      setSelectedSeason(s);
      const seasonObj = details?.seasons?.find((sn: any) => sn.number === s);
      const ep = seasonObj?.episodes?.[0]?.number || 1;
      setSelectedEpisode(ep);
      fetchStreams(activeSubjectId, provider, s, ep);
  };

  const handleEpisodeChange = (e: number) => {
      setSelectedEpisode(e);
      fetchStreams(activeSubjectId, provider, selectedSeason, e);
  };

  const playStream = async (stream: any, _qualityChoice: string = '1080p') => {
      const mirror = stream.mirrors?.[0];
      const url = mirror?.resolver_url;
      const headers = mirror?.headers || [];

      if (!url) {
          alert("Stream URL not found");
          return;
      }

      setPlaybackStatus(`Launching ${selectedPlayer.toUpperCase()} player...`);
      try {
          const res = await fetch(`${getApiBase()}/api/play`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                url, 
                headers, 
                player: selectedPlayer,
                sub_url: selectedSubtitle || undefined
              })
          });
          if (res.ok) {
              setPlaybackStatus(`Playing in ${selectedPlayer.toUpperCase()}!`);
          } else {
              setPlaybackStatus(`Failed to start ${selectedPlayer.toUpperCase()}. Is it installed?`);
          }
      } catch (err) {
          setPlaybackStatus("Error connecting to player service");
      }
      setTimeout(() => setPlaybackStatus(null), 5000);
  };

  const playInBrowser = (stream: any) => {
      const url = stream.mirrors?.[0]?.resolver_url;
      if (url) {
          setPlayingStreamUrl(url);
      }
  };

  const playInVlcMobile = (stream: any) => {
      const url = stream.mirrors?.[0]?.resolver_url;
      if (!url) return;
      const isAndroid = /Android/i.test(navigator.userAgent);
      if (isAndroid) {
          window.location.href = `intent://${url.replace(/^https?:\/\//i, '')}#Intent;package=org.videolan.vlc;scheme=https;end`;
      } else {
          window.location.href = `vlc://${url}`;
      }
  };

  // Browser download: streams direct to remote user's browser download manager
  const downloadInBrowser = (stream: any, qualityChoice: string = '1080p') => {
      const mirror = stream.mirrors?.[0];
      const url = mirror?.resolver_url;
      const headers = mirror?.headers || [];
      const titleClean = details?.title?.replace(/[^a-zA-Z0-9_-]/g, '_') || 'video';
      const filename = `${titleClean}_${qualityChoice}`;
      const headersJson = encodeURIComponent(JSON.stringify(headers));

      if (!url) {
          alert("Download link not available");
          return;
      }

      setPlaybackStatus(`Starting browser download for ${qualityChoice}...`);
      const apiBase = getApiBase();
      const downloadUrl = `${apiBase}/api/download-browser?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(filename)}&quality=${qualityChoice}&headers=${headersJson}`;
      
      // Opens directly in the user's browser download bar (works on deployed servers)
      window.open(downloadUrl, '_blank');
      setTimeout(() => setPlaybackStatus(null), 5000);
  };

  const copyStreamUrl = (stream: any, key: string) => {
      const mirror = stream.mirrors?.[0];
      const url = mirror?.resolver_url;
      if (url) {
          navigator.clipboard.writeText(url);
          setCopiedKey(key);
          setTimeout(() => setCopiedKey(null), 2000);
      }
  };

  const handleClose = () => {
      setPlayingStreamUrl(null);
      onClose();
  };

  if (!isOpen) return null;

  return (
    <div className={`modal-overlay ${isOpen ? 'open' : ''}`} onClick={handleClose}>
       <div className="modal-content details-modal" onClick={e => e.stopPropagation()}>
          <button className="icon-btn close-btn" onClick={handleClose} aria-label="Close">
            <X size={22} />
          </button>

          {playingStreamUrl ? (
              <div className="video-player-container" style={{ width: '100%', height: '100%', minHeight: '300px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <video 
                    controls 
                    autoPlay 
                    src={playingStreamUrl} 
                    style={{ width: '100%', borderRadius: '8px', backgroundColor: '#000' }}
                  >
                      Your browser does not support the video tag.
                  </video>
                  <button className="btn-secondary" onClick={() => setPlayingStreamUrl(null)}>Close Player</button>
              </div>
          ) : loading ? (
              <div className="loading-state">
                <div className="spinner"></div>
                <p>Loading details...</p>
              </div>
          ) : error ? (
              <div className="error-state">
                <p>{error}</p>
                <button className="btn-primary" onClick={onClose}>Close</button>
              </div>
          ) : details ? (
              <div className="details-container">
                  <div className="details-header-section">
                      <div className="details-poster-wrapper">
                          <img 
                            src={details.poster_url || details.cover_url || "https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=300&q=80"} 
                            alt={details.title} 
                            className="details-poster" 
                          />
                      </div>
                      <div className="details-info">
                          <h2 className="details-title">{details.title}</h2>
                          
                          <div className="meta-info">
                              {details.imdb_rating && (
                                <span className="meta-tag rating">
                                  <Star size={14} fill="#fbbf24" stroke="#fbbf24" /> {details.imdb_rating}
                                </span>
                              )}
                              {details.year && (
                                <span className="meta-tag">
                                  <Calendar size={14}/> {details.year}
                                </span>
                              )}
                              {details.duration && (
                                <span className="meta-tag">
                                  <Clock size={14}/> {details.duration}
                                </span>
                              )}
                              <span className="meta-tag badge-type">
                                <Film size={14}/> {details.media_type === 'series' ? 'TV Series' : 'Movie'}
                              </span>
                          </div>

                          {details.genres && details.genres.length > 0 && (
                            <div className="genres-list">
                              {details.genres.map((g: string, i: number) => (
                                <span key={i} className="genre-pill">{g}</span>
                              ))}
                            </div>
                          )}

                          <p className="description">{details.description || "No description available for this title."}</p>
                          
                          {/* Season & Episode Selector for TV Shows */}
                          {details.seasons && details.seasons.length > 0 && (
                              <div className="season-selector">
                                  <div className="select-group">
                                      <label>Season:</label>
                                      <select value={selectedSeason} onChange={e => handleSeasonChange(Number(e.target.value))}>
                                          {details.seasons.map((s: any) => (
                                              <option key={s.number} value={s.number}>Season {s.number}</option>
                                          ))}
                                      </select>
                                  </div>
                                  <div className="select-group">
                                      <label>Episode:</label>
                                      <select value={selectedEpisode} onChange={e => handleEpisodeChange(Number(e.target.value))}>
                                          {details.seasons.find((s: any) => s.number === selectedSeason)?.episodes?.map((ep: any) => (
                                              <option key={ep.number} value={ep.number}>Episode {ep.number} {ep.title ? `- ${ep.title}` : ''}</option>
                                          ))}
                                      </select>
                                  </div>
                              </div>
                          )}

                          {/* Audio Dub Track Selector */}
                          {details.dubs && details.dubs.length > 1 && (
                              <div className="audio-selector" style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                  <Headphones size={16} color="var(--primary)" />
                                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Audio Track:</span>
                                  <select 
                                      value={activeSubjectId} 
                                      onChange={e => handleAudioChange(e.target.value)}
                                      style={{
                                          padding: '0.35rem 0.75rem',
                                          borderRadius: 'var(--radius-sm)',
                                          background: 'var(--bg-surface-light)',
                                          color: 'var(--text-main)',
                                          border: '1px solid var(--border-color)',
                                          fontSize: '0.85rem'
                                      }}
                                  >
                                      {details.dubs.map((dub: any, idx: number) => (
                                          <option key={idx} value={dub.subject_id}>
                                              {dub.label || dub.language}
                                          </option>
                                      ))}
                                  </select>
                              </div>
                          )}

                          {/* Subtitle Selector */}
                          {subtitles.length > 0 && (
                              <div className="subtitle-selector" style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                  <Subtitles size={16} color="var(--primary)" />
                                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Subtitles:</span>
                                  <select 
                                      value={selectedSubtitle} 
                                      onChange={e => setSelectedSubtitle(e.target.value)}
                                      style={{
                                          padding: '0.35rem 0.75rem',
                                          borderRadius: 'var(--radius-sm)',
                                          background: 'var(--bg-surface-light)',
                                          color: 'var(--text-main)',
                                          border: '1px solid var(--border-color)',
                                          fontSize: '0.85rem'
                                      }}
                                  >
                                      <option value="">None / Default</option>
                                      {subtitles.map((sub, idx) => (
                                          <option key={idx} value={sub.url}>
                                              {sub.name}
                                          </option>
                                      ))}
                                  </select>
                              </div>
                          )}

                          {/* Player Selection & Detection */}
                          <div className="player-selection-row" style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Player:</span>
                              <div style={{ display: 'flex', gap: '0.5rem' }}>
                                  <button 
                                      className={`btn-secondary btn-sm ${selectedPlayer === 'mpv' ? 'active-pill' : ''}`}
                                      onClick={() => setSelectedPlayer('mpv')}
                                      style={{ padding: '0.25rem 0.75rem' }}
                                  >
                                      MPV
                                  </button>
                                  <button 
                                      className={`btn-secondary btn-sm ${selectedPlayer === 'vlc' ? 'active-pill' : ''}`}
                                      onClick={() => setSelectedPlayer('vlc')}
                                      style={{ padding: '0.25rem 0.75rem' }}
                                  >
                                      VLC
                                  </button>
                              </div>

                              {availablePlayers.length === 0 && (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#f59e0b', fontSize: '0.8rem' }}>
                                      <AlertCircle size={14} />
                                      <span>MPV or VLC not found. Please install: <code>sudo apt install mpv</code> or <code>sudo apt install vlc</code></span>
                                  </div>
                              )}
                          </div>

                          {playbackStatus && (
                            <div className="playback-notification">
                              {playbackStatus}
                            </div>
                          )}
                      </div>
                  </div>

                  {/* Streams & Files Section */}
                  <div className="streams-section">
                      <div className="streams-header">
                        <h3>Available Qualities & Downloads</h3>
                        <span className="file-count-badge">
                          {loadingStreams ? "Searching..." : "Ready to Stream & Download"}
                        </span>
                      </div>

                      {loadingStreams ? (
                          <div className="loading-streams">
                            <div className="spinner sm"></div>
                            <span>Searching for streams & download links...</span>
                          </div>
                      ) : streams.length > 0 ? (
                          <div className="file-list">
                              {streams.map((s, streamIdx) => {
                                  const mirror = s.mirrors?.[0];
                                  const hasMirror = !!mirror?.resolver_url;
                                  const isMulti = s.quality === 'multi' || !s.quality;

                                  // If stream is multi-resolution, expand into separate qualities
                                  const qualityList = isMulti ? [
                                    { label: '1080p Full HD', resKey: '1080p', desc: 'High Bitrate (Best Quality)' },
                                    { label: '720p HD', resKey: '720p', desc: 'Standard HD (Recommended)' },
                                    { label: '480p SD', resKey: '480p', desc: 'Data Saver' },
                                  ] : [
                                    { label: `${s.quality.toUpperCase()}`, resKey: s.quality, desc: formatBytes(s.size_bytes) }
                                  ];

                                  return (
                                    <React.Fragment key={streamIdx}>
                                      {qualityList.map((q) => {
                                        const keyId = `${streamIdx}-${q.resKey}`;
                                        return (
                                          <div key={keyId} className="file-item">
                                              <div className="file-info">
                                                  <div className="file-icon">
                                                      <FileVideo size={22} />
                                                  </div>
                                                  <div className="file-details">
                                                      <span className="file-name" title={s.filename}>
                                                          {details.title} - {q.label}
                                                      </span>
                                                      <div className="file-meta">
                                                          <span className="badge">{q.resKey.toUpperCase()}</span>
                                                          {s.codec && <span className="codec-badge">{s.codec.toUpperCase()}</span>}
                                                          <span className="file-size">{q.desc}</span>
                                                          <span className="provider-tag">{s.provider || provider}</span>
                                                      </div>
                                                  </div>
                                              </div>
                                              <div className="file-actions">
                                                  <button 
                                                    className="btn-primary btn-sm" 
                                                    disabled={!hasMirror}
                                                    onClick={() => playInBrowser(s)}
                                                    title="Stream directly in browser"
                                                  >
                                                      <Play size={15} fill="currentColor" /> Web Player
                                                  </button>
                                                  <button 
                                                    className="btn-secondary btn-sm" 
                                                    disabled={!hasMirror}
                                                    onClick={() => playInVlcMobile(s)}
                                                    title="Force open in VLC app (Mobile)"
                                                  >
                                                      <Play size={15} /> VLC App
                                                  </button>
                                                  <button 
                                                    className="btn-secondary btn-sm" 
                                                    disabled={!hasMirror}
                                                    onClick={() => playStream(s, q.resKey)}
                                                    title={`Stream in ${selectedPlayer.toUpperCase()} (Local Only)`}
                                                  >
                                                      <Play size={15} /> PC Player
                                                  </button>
                                                  <button 
                                                    className="btn-secondary btn-sm" 
                                                    disabled={!hasMirror}
                                                    onClick={() => downloadInBrowser(s, q.resKey)}
                                                    title="Download directly in your browser"
                                                  >
                                                      <Download size={15} /> Download
                                                  </button>
                                                  <button 
                                                    className="btn-secondary btn-sm copy-btn" 
                                                    disabled={!hasMirror}
                                                    onClick={() => copyStreamUrl(s, keyId)}
                                                    title="Copy Stream Link"
                                                  >
                                                      {copiedKey === keyId ? <Check size={15} color="#34a853" /> : <Copy size={15} />}
                                                  </button>
                                              </div>
                                          </div>
                                        );
                                      })}
                                    </React.Fragment>
                                  );
                              })}
                          </div>
                      ) : (
                          <div className="no-streams">
                            No streams or download links found for this title.
                          </div>
                      )}
                  </div>
              </div>
          ) : null}
       </div>
    </div>
  );
};

export default DetailsModal;
