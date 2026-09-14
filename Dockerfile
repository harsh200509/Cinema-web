FROM rust:slim-bookworm AS builder

# Install build dependencies
RUN apt-get update && apt-get install -y pkg-config libssl-dev build-essential && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/src/app
COPY . .

# Build the application
RUN cargo build --release

# Create a minimal runtime image
FROM debian:bookworm-slim

# Install runtime dependencies
RUN apt-get update && apt-get install -y ca-certificates libssl3 && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=builder /usr/src/app/target/release/cinema /usr/local/bin/cinema

# Cloud Run provides the PORT environment variable (default 8080)
ENV PORT=8080

EXPOSE 8080

# Start the application
CMD ["cinema"]
