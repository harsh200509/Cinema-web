use axum::{
    extract::{Query, State},
    routing::{get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tower_http::cors::{Any, CorsLayer};

use crate::providers::models::{CatalogItem, MediaDetails, ProviderKind, Release};
use crate::service::MovieBoxService;
use crate::player::{PlayerKind, command};

#[derive(Clone)]
pub struct AppState {
    pub service: Arc<MovieBoxService>,
}

#[derive(Deserialize)]
pub struct HomepageQuery {
    pub tab: Option<String>,
    pub page: Option<usize>,
}

#[derive(Serialize)]
pub struct HomepageResponse {
    pub items: Vec<CatalogItem>,
}

pub async fn homepage_handler(
    State(state): State<AppState>,
    Query(query): Query<HomepageQuery>,
) -> Result<Json<HomepageResponse>, axum::http::StatusCode> {
    let tab = query.tab.unwrap_or_else(|| "movie".to_string());
    let page = query.page.unwrap_or(1);

    match state.service.homepage(&tab, page).await {
        Ok((items, _metrics)) => Ok(Json(HomepageResponse { items })),
        Err(e) => {
            log::error!("Homepage error: {}", e);
            Err(axum::http::StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

#[derive(Deserialize)]
pub struct SearchQuery {
    pub q: String,
    pub provider: Option<String>,
    pub page: Option<usize>,
}

#[derive(Serialize)]
pub struct SearchResponse {
    pub items: Vec<CatalogItem>,
}

pub async fn search_handler(
    State(state): State<AppState>,
    Query(query): Query<SearchQuery>,
) -> Result<Json<SearchResponse>, axum::http::StatusCode> {
    let provider = query.provider.as_deref().and_then(ProviderKind::parse).unwrap_or(ProviderKind::MovieBox);
    let page = query.page.unwrap_or(1);

    match state.service.search_typed(provider, &query.q, page).await {
        Ok(items) => Ok(Json(SearchResponse { items })),
        Err(e) => {
            log::error!("Search error: {:?}", e);
            Err(axum::http::StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

#[derive(Deserialize)]
pub struct DetailsQuery {
    pub id: String,
    pub provider: Option<String>,
}

pub async fn details_handler(
    State(state): State<AppState>,
    Query(query): Query<DetailsQuery>,
) -> Result<Json<MediaDetails>, axum::http::StatusCode> {
    let provider = query.provider.as_deref().and_then(ProviderKind::parse).unwrap_or(ProviderKind::MovieBox);

    match state.service.details_typed(provider, &query.id).await {
        Ok(details) => Ok(Json(details)),
        Err(e) => {
            log::error!("Details error: {:?}", e);
            Err(axum::http::StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

#[derive(Deserialize)]
pub struct StreamsQuery {
    pub id: String,
    pub season: Option<usize>,
    pub episode: Option<usize>,
    pub provider: Option<String>,
}

async fn check_url_validity(client: &reqwest::Client, url: &str, headers: &[(String, String)]) -> bool {
    let mut req = client.get(url).timeout(std::time::Duration::from_secs(4));
    for (k, v) in headers {
        if let (Ok(name), Ok(val)) = (
            reqwest::header::HeaderName::from_bytes(k.as_bytes()),
            reqwest::header::HeaderValue::from_str(v),
        ) {
            req = req.header(name, val);
        }
    }
    req = req.header("Range", "bytes=0-0");
    if let Ok(resp) = req.send().await {
        let status = resp.status();
        status.is_success() || status.is_redirection() || status.as_u16() == 416
    } else {
        false
    }
}

pub async fn streams_handler(
    State(state): State<AppState>,
    Query(query): Query<StreamsQuery>,
) -> Result<Json<Vec<Release>>, axum::http::StatusCode> {
    let provider = query.provider.as_deref().and_then(ProviderKind::parse).unwrap_or(ProviderKind::MovieBox);
    let season = query.season.unwrap_or(0);
    let episode = query.episode.unwrap_or(0);

    match state.service.streams_typed(provider, &query.id, season, episode).await {
        Ok(streams) => {
            let client = reqwest::Client::new();
            let mut tasks = Vec::new();

            for mut release in streams {
                let client = client.clone();
                tasks.push(async move {
                    let mut valid_mirrors = Vec::new();
                    let mut mirror_tasks = Vec::new();
                    
                    for mirror in release.mirrors {
                        let c = client.clone();
                        mirror_tasks.push(async move {
                            let is_valid = check_url_validity(&c, &mirror.resolver_url, &mirror.headers).await;
                            (mirror, is_valid)
                        });
                    }
                    
                    for (mirror, is_valid) in futures::future::join_all(mirror_tasks).await {
                        if is_valid {
                            valid_mirrors.push(mirror);
                        }
                    }
                    
                    if !valid_mirrors.is_empty() {
                        release.mirrors = valid_mirrors;
                        Some(release)
                    } else {
                        None
                    }
                });
            }

            let valid_streams = futures::future::join_all(tasks)
                .await
                .into_iter()
                .flatten()
                .collect::<Vec<_>>();

            Ok(Json(valid_streams))
        }
        Err(e) => {
            log::error!("Streams error: {:?}", e);
            Err(axum::http::StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

#[derive(Deserialize)]
pub struct PlayRequest {
    pub url: String,
    pub player: Option<String>,
    pub headers: Option<Vec<(String, String)>>,
    pub sub_url: Option<String>,
}

pub async fn play_handler(
    Json(payload): Json<PlayRequest>,
) -> Result<Json<&'static str>, axum::http::StatusCode> {
    let player = payload.player.as_deref().and_then(PlayerKind::parse).unwrap_or_else(|| {
        let players = crate::player::detect();
        players.into_iter().next().unwrap_or(PlayerKind::Mpv)
    });
    
    let headers = payload.headers.unwrap_or_default();

    let needs_proxy = player == PlayerKind::Vlc && headers.iter().any(|(name, _)| {
        !name.eq_ignore_ascii_case("referer") && !name.eq_ignore_ascii_case("user-agent")
    });

    let play_url = if needs_proxy {
        match crate::proxy::spawn_sidecar(&payload.url, &headers, payload.sub_url.as_deref()) {
            Ok(local_url) => local_url,
            Err(e) => {
                log::warn!("Failed to spawn VLC proxy sidecar: {}, using direct url", e);
                payload.url.clone()
            }
        }
    } else {
        payload.url.clone()
    };

    let mut cmd = command(
        player,
        &play_url,
        payload.sub_url.as_deref(),
        &headers,
        None,
        None,
        None
    );

    match cmd.spawn() {
        Ok(_) => Ok(Json("Playback started")),
        Err(e) => {
            log::error!("Failed to start player: {}", e);
            Err(axum::http::StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

#[derive(Deserialize)]
pub struct DownloadRequest {
    pub url: String,
    pub filename: Option<String>,
    pub headers: Option<Vec<(String, String)>>,
}

#[derive(Serialize)]
pub struct DownloadResponse {
    pub message: String,
    pub path: String,
}

pub async fn download_handler(
    Json(payload): Json<DownloadRequest>,
) -> Result<Json<DownloadResponse>, axum::http::StatusCode> {
    let download_dir = dirs::download_dir()
        .or_else(|| dirs::home_dir().map(|h| h.join("Downloads")))
        .unwrap_or_else(|| std::path::PathBuf::from("."));

    let raw_name = payload
        .filename
        .as_deref()
        .unwrap_or("MovieBox_Download");

    let sanitized_name: String = raw_name
        .chars()
        .map(|c| if "/\\:*?\"<>|".contains(c) { '_' } else { c })
        .collect();

    let mut dest = download_dir.join(&sanitized_name);
    if dest.extension().is_none() {
        dest.set_extension("mp4");
    }

    let headers = payload.headers.unwrap_or_default();
    let ytdlp_bin = crate::player::find_in_path("yt-dlp").unwrap_or_else(|| "yt-dlp".into());
    let mut cmd = tokio::process::Command::new(ytdlp_bin);

    for (k, v) in &headers {
        if k.eq_ignore_ascii_case("user-agent") {
            cmd.arg("--user-agent").arg(v);
        } else if k.eq_ignore_ascii_case("cookie") {
            let mut cookie_val = v.clone();
            if cookie_val.contains("CloudFront-Policy") && !cookie_val.contains("CloudFront-Key-Pair-Id") {
                cookie_val.push_str("; CloudFront-Key-Pair-Id=KMHN1LQ1HEUPL");
            }
            let c_path = std::env::temp_dir().join(format!("mb_cookie_{}.txt", rand::random::<u32>()));
            let mut c_content = String::from("# Netscape HTTP Cookie File\n");
            
            let host = url::Url::parse(&payload.url)
                .ok()
                .and_then(|u| u.host_str().map(String::from))
                .unwrap_or_else(|| ".hakunaymatata.com".to_string());
                
            for part in cookie_val.split(';') {
                let part = part.trim();
                if let Some((ckey, cval)) = part.split_once('=') {
                    let domain = if host.starts_with('.') { host.clone() } else { format!(".{}", host) };
                    c_content.push_str(&format!("{}\tTRUE\t/\tFALSE\t2000000000\t{}\t{}\n", domain, ckey.trim(), cval.trim()));
                }
            }
            if std::fs::write(&c_path, c_content).is_ok() {
                cmd.arg("--cookies").arg(&c_path);
            }
        } else {
            cmd.arg("--add-header").arg(format!("{k}: {v}"));
        }
    }

    cmd.arg("-f")
        .arg("bestvideo+bestaudio/best")
        .arg("--newline")
        .arg("-o")
        .arg(&dest)
        .arg("--force-overwrites")
        .arg(&payload.url);

    match cmd.spawn() {
        Ok(_) => Ok(Json(DownloadResponse {
            message: "Download started".to_string(),
            path: dest.display().to_string(),
        })),
        Err(e) => {
            log::error!("Failed to start download: {}", e);
            Err(axum::http::StatusCode::INTERNAL_SERVER_ERROR)
        }
    }
}

#[derive(Deserialize)]
pub struct SubtitlesQuery {
    pub id: String,
    pub resource_id: Option<String>,
}

pub async fn subtitles_handler(
    State(state): State<AppState>,
    Query(query): Query<SubtitlesQuery>,
) -> Result<Json<Vec<crate::providers::models::SubtitleOption>>, axum::http::StatusCode> {
    let resource_id = query.resource_id.unwrap_or_default();
    match state.service.get_ext_captions(&query.id, &resource_id, &[], 0, 0).await {
        Ok(captions) => Ok(Json(captions)),
        Err(_) => Ok(Json(Vec::new())),
    }
}

#[derive(Serialize)]
pub struct AvailablePlayersResponse {
    pub players: Vec<String>,
}

pub async fn players_handler() -> Json<AvailablePlayersResponse> {
    let players = crate::player::detect()
        .into_iter()
        .map(|p| p.label().to_string())
        .collect();
    Json(AvailablePlayersResponse { players })
}

#[derive(Deserialize)]
pub struct BrowserDownloadQuery {
    pub url: String,
    pub filename: Option<String>,
    pub quality: Option<String>,
    pub headers: Option<String>,
}

pub async fn browser_download_handler(
    Query(query): Query<BrowserDownloadQuery>,
) -> Result<(axum::http::HeaderMap, axum::body::Body), axum::http::StatusCode> {
    let raw_name = query.filename.as_deref().unwrap_or("Cinema_Download");
    let sanitized_name: String = raw_name
        .chars()
        .map(|c| if "/\\:*?\"<>|".contains(c) { '_' } else { c })
        .collect();

    let headers: Vec<(String, String)> = query
        .headers
        .as_deref()
        .and_then(|h| serde_json::from_str(h).ok())
        .unwrap_or_default();

    let url_lower = query.url.to_lowercase();
    let is_manifest_url = url_lower.contains("m3u8") || url_lower.contains(".mpd");

    if !is_manifest_url {
        let client_builder = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(3600));

        let mut req_headers = reqwest::header::HeaderMap::new();
        for (k, v) in &headers {
            if let (Ok(name), Ok(val)) = (
                reqwest::header::HeaderName::from_bytes(k.as_bytes()),
                reqwest::header::HeaderValue::from_str(v),
            ) {
                req_headers.insert(name, val);
            }
        }

        if let Ok(client) = client_builder.default_headers(req_headers).build() {
            if let Ok(mut resp) = client.get(&query.url).send().await {
                if resp.status().is_success() {
                    if let Ok(Some(first_chunk)) = resp.chunk().await {
                        let is_manifest = first_chunk.starts_with(b"#EXTM3U") 
                            || first_chunk.starts_with(b"#EXT")
                            || first_chunk.starts_with(b"<!DOCTYPE")
                            || first_chunk.starts_with(b"<html")
                            || first_chunk.starts_with(b"{")
                            || first_chunk.starts_with(b"<?xml")
                            || first_chunk.starts_with(b"<MPD");

                        if !is_manifest {
                            let content_length = resp
                                .headers()
                                .get(axum::http::header::CONTENT_LENGTH)
                                .cloned();

                            use futures::StreamExt;
                            let first_stream = futures::stream::once(async move { Ok::<_, reqwest::Error>(first_chunk) });
                            let full_stream = first_stream.chain(resp.bytes_stream());
                            let body = axum::body::Body::from_stream(full_stream);

                            let mut headers_map = axum::http::HeaderMap::new();
                            headers_map.insert(
                                axum::http::header::CONTENT_TYPE,
                                axum::http::HeaderValue::from_static("video/mp4"),
                            );
                            if let Some(cl) = content_length {
                                headers_map.insert(axum::http::header::CONTENT_LENGTH, cl);
                            }
                            let disposition = format!("attachment; filename=\"{sanitized_name}.mp4\"");
                            headers_map.insert(
                                axum::http::header::CONTENT_DISPOSITION,
                                axum::http::HeaderValue::from_str(&disposition).unwrap_or(
                                    axum::http::HeaderValue::from_static("attachment; filename=\"video.mp4\""),
                                ),
                            );

                            return Ok((headers_map, body));
                        }
                    }
                }
            }
        }
    }

    // Fallback to ffmpeg for HLS/DASH playlists or non-direct streams to avoid yt-dlp cookie passing bugs
    let ffmpeg_bin = crate::player::find_in_path("ffmpeg").unwrap_or_else(|| "ffmpeg".into());
    let mut cmd = tokio::process::Command::new(ffmpeg_bin);

    let mut headers_str = String::new();
    for (k, v) in &headers {
        if k.eq_ignore_ascii_case("cookie") {
            let mut cookie_val = v.clone();
            if cookie_val.contains("CloudFront-Policy") && !cookie_val.contains("CloudFront-Key-Pair-Id") {
                cookie_val.push_str("; CloudFront-Key-Pair-Id=KMHN1LQ1HEUPL");
            }
            headers_str.push_str(&format!("Cookie: {}\r\n", cookie_val));
        } else {
            headers_str.push_str(&format!("{}: {}\r\n", k, v));
        }
    }

    cmd.arg("-loglevel")
        .arg("error")
        .arg("-headers")
        .arg(&headers_str)
        .arg("-i")
        .arg(&query.url)
        .arg("-c")
        .arg("copy")
        .arg("-f")
        .arg("mp4")
        .arg("-movflags")
        .arg("frag_keyframe+empty_moov")
        .arg("pipe:1")
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::inherit());

    let mut child = cmd.spawn().map_err(|e| {
        log::error!("Failed to spawn ffmpeg for browser download: {}", e);
        axum::http::StatusCode::INTERNAL_SERVER_ERROR
    })?;

    let stdout = child.stdout.take().ok_or(axum::http::StatusCode::INTERNAL_SERVER_ERROR)?;

    let stream = futures::stream::unfold((stdout, child), |(mut stdout, child)| async move {
        use tokio::io::AsyncReadExt;
        let mut buf = vec![0u8; 64 * 1024];
        match stdout.read(&mut buf).await {
            Ok(0) => None,
            Ok(n) => {
                buf.truncate(n);
                Some((Ok::<_, std::io::Error>(axum::body::Bytes::from(buf)), (stdout, child)))
            }
            Err(e) => Some((Err(e), (stdout, child))),
        }
    });

    let body = axum::body::Body::from_stream(stream);

    let mut headers_map = axum::http::HeaderMap::new();
    headers_map.insert(
        axum::http::header::CONTENT_TYPE,
        axum::http::HeaderValue::from_static("video/mp4"),
    );
    let disposition = format!("attachment; filename=\"{sanitized_name}.mp4\"");
    headers_map.insert(
        axum::http::header::CONTENT_DISPOSITION,
        axum::http::HeaderValue::from_str(&disposition)
            .unwrap_or(axum::http::HeaderValue::from_static("attachment; filename=\"video.mp4\"")),
    );

    Ok((headers_map, body))
}

pub async fn start_server(port: u16) -> Result<(), std::io::Error> {
    log::info!("Starting MovieBox API server on port {}", port);
    
    let service = Arc::new(MovieBoxService::new());
    let state = AppState { service };

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let app = Router::new()
        .route("/api/homepage", get(homepage_handler))
        .route("/api/search", get(search_handler))
        .route("/api/details", get(details_handler))
        .route("/api/streams", get(streams_handler))
        .route("/api/play", post(play_handler))
        .route("/api/download", post(download_handler))
        .route("/api/download-browser", get(browser_download_handler))
        .route("/api/subtitles", get(subtitles_handler))
        .route("/api/players", get(players_handler))
        .with_state(state)
        .layer(cors);

    let listener = tokio::net::TcpListener::bind(format!("127.0.0.1:{}", port))
        .await
        .unwrap();

    println!("MovieBox API Server running at http://127.0.0.1:{}", port);
    
    axum::serve(listener, app)
        .await
        .map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e.to_string()))
}
