import express from "express";
import { createServer } from "http";
import { spawn } from "child_process";
import path from "path";
import { Readable } from "stream";
import { serveStatic, log } from "./vite";

const app = express();

// Serve static files from the static directory for uploaded assets
app.use('/static', express.static(path.resolve(process.cwd(), 'static')));

// Raw body middleware for proxy - no parsing, just raw stream
app.use('/api', express.raw({ type: '*/*', limit: '50mb' }));

// Define safe headers to forward (whitelist approach for security)
const SAFE_REQUEST_HEADERS = new Set([
  'authorization',
  'cookie',
  'content-type',
  'accept',
  'accept-encoding',
  'accept-language',
  'accept-charset',
  'user-agent',
  'referer',
  'origin',
  'cache-control',
  'pragma',
  'if-match',
  'if-none-match',
  'if-modified-since',
  'if-unmodified-since',
  'range'
]);

// Headers that should never be forwarded (hop-by-hop and security sensitive)
const FORBIDDEN_REQUEST_HEADERS = new Set([
  'host',
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailers',
  'transfer-encoding',
  'upgrade',
  'content-length', // Let fetch recompute this for security
  'expect'
]);

const FORBIDDEN_RESPONSE_HEADERS = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailers',
  'transfer-encoding',
  'upgrade',
  'content-length', // Let Express handle this
  'content-encoding' // Let Express handle this
]);

// Streaming reverse proxy for FastAPI backend
app.use('/api', async (req, res) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45000); // 45 second timeout
  
  try {
    const proxyUrl = `http://0.0.0.0:8000${req.originalUrl}`;
    
    // Sanitize and forward only safe request headers
    const proxyHeaders: Record<string, string> = {};
    Object.entries(req.headers).forEach(([key, value]) => {
      const lowerKey = key.toLowerCase();
      
      // Skip forbidden headers
      if (FORBIDDEN_REQUEST_HEADERS.has(lowerKey)) {
        return;
      }
      
      // Forward safe headers and x-* custom headers
      if (SAFE_REQUEST_HEADERS.has(lowerKey) || lowerKey.startsWith('x-')) {
        if (typeof value === 'string') {
          proxyHeaders[key] = value;
        } else if (Array.isArray(value) && value.length > 0) {
          proxyHeaders[key] = value[0];
        }
      }
    });

    // True streaming: Use Readable.toWeb(req) for zero-copy streaming
    let requestBody: BodyInit | undefined;
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      // Use the raw stream directly - no buffering!
      requestBody = Readable.toWeb(req) as ReadableStream;
    }

    const response = await fetch(proxyUrl, {
      method: req.method,
      headers: proxyHeaders,
      body: requestBody,
      signal: controller.signal
    });

    clearTimeout(timeout);

    // Copy response status
    res.status(response.status);
    
    // Sanitize and forward safe response headers
    response.headers.forEach((value, key) => {
      const lowerKey = key.toLowerCase();
      if (!FORBIDDEN_RESPONSE_HEADERS.has(lowerKey)) {
        res.setHeader(key, value);
      }
    });

    // Stream the response body directly
    if (response.body) {
      const reader = response.body.getReader();
      
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          // Check if response was aborted/closed
          if (res.destroyed) {
            reader.cancel();
            break;
          }
          
          res.write(Buffer.from(value));
        }
        res.end();
      } catch (streamError) {
        log(`Response streaming error: ${streamError instanceof Error ? streamError.message : String(streamError)}`);
        if (!res.headersSent) {
          res.status(502).json({ error: 'Response streaming failed' });
        } else {
          res.end();
        }
      } finally {
        reader.releaseLock();
      }
    } else {
      res.end();
    }
    
  } catch (error) {
    clearTimeout(timeout);
    
    let statusCode = 500;
    let errorMessage = 'Internal proxy error';
    
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        statusCode = 504;
        errorMessage = 'Gateway timeout';
      } else if (error.message.includes('ECONNREFUSED')) {
        statusCode = 502;
        errorMessage = 'Backend service unavailable';
      } else {
        errorMessage = error.message;
      }
    }
    
    log(`Proxy error: ${errorMessage}`);
    
    if (!res.headersSent) {
      res.status(statusCode).json({ 
        error: errorMessage,
        timestamp: new Date().toISOString()
      });
    } else {
      res.end();
    }
  }
});

const server = createServer(app);

// Start FastAPI backend
const fastapi = spawn('python', ['-m', 'uvicorn', 'app.main:app', '--host', '0.0.0.0', '--port', '8000', '--reload'], {
  cwd: process.cwd(),
  stdio: 'inherit'
});

fastapi.on('error', (error) => {
  log(`FastAPI error: ${error.message}`);
});

// Setup frontend serving
(async () => {
  if (app.get("env") === "development") {
    const { setupVite } = await import("./vite");
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
})();

const port = parseInt(process.env.PORT || '5000', 10);
server.listen({
  port,
  host: "0.0.0.0",
  reusePort: true,
}, () => {
  log(`Frontend serving on port ${port}`);
  log(`Backend API available at http://localhost:8000`);
});
