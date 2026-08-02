# Frontend Dockerfile - Multi-stage build
# Stage 1: Build the React application
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Stage 2: Serve static files with Python's http.server
FROM python:3.12-alpine

WORKDIR /app

# Copy built assets from builder stage
COPY --from=builder /app/dist ./dist

# Create a simple HTTP server script with API proxy
RUN cat > server.py << 'PYEOF'
import http.server
import socketserver
import urllib.request
import urllib.error
import json
import sys

class ProxyHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory="/app/dist", **kwargs)
    
    def do_GET(self):
        # Proxy /api requests to backend
        if self.path.startswith('/api'):
            self.proxy_request()
        else:
            # Serve static files (with SPA fallback to index.html)
            if self.path == '/' or self.path == '':
                self.path = '/index.html'
            elif '.' not in self.path.split('/')[-1]:
                # Likely a SPA route - try to serve index.html
                self.path = '/index.html'
            super().do_GET()
    
    def do_POST(self):
        if self.path.startswith('/api'):
            self.proxy_request()
        else:
            self.send_error(404)
    
    def do_PUT(self):
        if self.path.startswith('/api'):
            self.proxy_request()
        else:
            self.send_error(404)
    
    def do_DELETE(self):
        if self.path.startswith('/api'):
            self.proxy_request()
        else:
            self.send_error(404)
    
    def proxy_request(self):
        backend_url = "http://backend:8000" + self.path
        
        # Read request body
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length) if content_length > 0 else None
        
        # Create request to backend
        req = urllib.request.Request(backend_url, data=body, method=self.command)
        
        # Copy headers (skip host)
        for header, value in self.headers.items():
            if header.lower() != 'host':
                req.add_header(header, value)
        
        try:
            with urllib.request.urlopen(req, timeout=30) as response:
                self.send_response(response.status)
                for header, value in response.headers.items():
                    self.send_header(header, value)
                self.end_headers()
                self.wfile.write(response.read())
        except urllib.error.HTTPError as e:
            self.send_response(e.code)
            for header, value in e.headers.items():
                self.send_header(header, value)
            self.end_headers()
            self.wfile.write(e.read())
        except Exception as e:
            self.send_error(502, f"Bad Gateway: {str(e)}")
    
    def log_message(self, format, *args):
        # Suppress default log messages
        pass

if __name__ == "__main__":
    PORT = 5173
    with socketserver.TCPServer(("", PORT), ProxyHandler) as httpd:
        print(f"Frontend server running on port {PORT}")
        httpd.serve_forever()
PYEOF

# Expose port
EXPOSE 5173

# Run the server
CMD ["python", "server.py"]
