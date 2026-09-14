# Cinema Web UI

A modern, responsive web interface for finding, downloading, and streaming movies, TV shows, and live TV. 

This is the frontend component of the Cinema project. It provides a beautiful React interface to interact with the backend API, allowing you to stream media directly in your browser or forcefully open it in your mobile video players (like VLC).

## Features

- **On Demand Streaming**: Browse movies, series, and anime.
- **Web Player**: Stream directly inside your browser using the built-in HTML5 video player.
- **Mobile Deep Linking**: Special integration to instantly launch the VLC app on your phone (Android/iOS) to handle heavy video streams.
- **Browser Downloads**: Download high-quality streams directly to your local device.
- **Cloudflare Ready**: Fully configured to be deployed on Cloudflare Pages for instant, global CDN hosting.

## Tech Stack

- **Framework:** React + TypeScript + Vite
- **Styling:** Vanilla CSS with Lucide Icons
- **Deployment:** Cloudflare Pages (Frontend)

## Local Development

To run the frontend locally:

```bash
npm install
npm run dev
```

*Note: This frontend requires the Cinema Rust API to be running on `http://127.0.0.1:8000` (or configured via environment variables).*
