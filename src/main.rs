#[cfg(not(target_os = "android"))]
#[global_allocator]
static GLOBAL: mimalloc::MiMalloc = mimalloc::MiMalloc;

fn purge_stale_subtitles() {
    tokio::task::spawn_blocking(|| {
        let max_age = 24 * 60 * 60;
        let mut dirs = vec![
            cinema::service::resolve_subtitle_dir(),
            std::env::temp_dir().join("cinema/subs"),
        ];
        if let Some(home) = dirs::home_dir() {
            let android_storage = home.join("storage/downloads/cinema_subs");
            if home.join("storage/downloads").exists() {
                dirs.push(android_storage);
            }
        }

        for dir in dirs {
            if dir.exists()
                && let Ok(entries) = std::fs::read_dir(&dir)
            {
                for entry in entries.flatten() {
                    if let Ok(metadata) = entry.metadata()
                        && let Ok(modified) = metadata.modified()
                        && let Ok(elapsed) = modified.elapsed()
                        && elapsed.as_secs() > max_age
                    {
                        let _ = std::fs::remove_file(entry.path());
                    }
                }
            }
        }
    });
}

fn purge_stale_update_artifacts() {
    tokio::task::spawn_blocking(|| {
        if let Ok(current_exe) = std::env::current_exe() {
            cinema::updater::apply::cleanup_stale_update_artifacts(&current_exe);
        }
    });
}

#[tokio::main]
async fn main() -> std::io::Result<()> {
    let args: Vec<String> = std::env::args().collect();
    if let Some(pos) = args.iter().position(|a| a == "--proxy-for-vlc") {
        let target_url = args.get(pos + 1).cloned().unwrap_or_default();
        let headers_json = args
            .get(pos + 2)
            .cloned()
            .unwrap_or_else(|| "[]".to_string());
        let sub_url = args.get(pos + 3).cloned().filter(|s| !s.is_empty());
        let headers: Vec<(String, String)> =
            serde_json::from_str(&headers_json).unwrap_or_default();
        cinema::proxy::run_sidecar(target_url, headers, sub_url).await;
        return Ok(());
    }
    if args.iter().any(|arg| arg == "--help" || arg == "-h") {
        println!("cinema {}", env!("CARGO_PKG_VERSION"));
        println!("A high-performance media proxy and API backend for Cinema web UI.\n");
        println!("USAGE:");
        println!("    cinema [OPTIONS]\n");
        println!("OPTIONS:");
        println!("    -h, --help           Print help information");
        println!("    -v, -V, --version    Print version information");
        println!("    -p, --port [PORT]    Specify port to run the API server (default: 8000)\n");
        println!("ENVIRONMENT VARIABLES:");
        println!("    CINEMA_LOG           Log level (off, error, warn, info, debug, trace)");
        return Ok(());
    }
    if args
        .iter()
        .any(|arg| arg == "--version" || arg == "-v" || arg == "-V")
    {
        println!("cinema {}", env!("CARGO_PKG_VERSION"));
        return Ok(());
    }

    cinema::logging::init();

    // The backend now defaults to starting the API server immediately.
    let mut port = std::env::var("PORT")
        .unwrap_or_else(|_| "8000".to_string())
        .parse::<u16>()
        .unwrap_or(8000);
    
    // Check if user passed -p or --port
    if let Some(pos) = args.iter().position(|arg| arg == "-p" || arg == "--port") {
        if let Some(port_str) = args.get(pos + 1) {
            if let Ok(p) = port_str.parse::<u16>() {
                port = p;
            }
        }
    } else if let Some(pos) = args.iter().position(|arg| arg == "--server") {
        // Backwards compatibility for the old --server flag
        if let Some(port_str) = args.get(pos + 1) {
            if let Ok(p) = port_str.parse::<u16>() {
                port = p;
            }
        }
    }

    std::panic::set_hook(Box::new(|info| {
        log::error!("panic: {info}");
        eprintln!("{info}");
    }));

    cinema::cache::clean_old_cache_background();
    purge_stale_subtitles();
    purge_stale_update_artifacts();

    log::info!("Starting Cinema backend on port {}", port);
    cinema::api::start_server(port).await
}
