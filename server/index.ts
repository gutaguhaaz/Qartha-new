import express from "express";
import { createServer } from "http";
import { spawn } from "child_process";
import path from "path";
import { serveStatic, log } from "./vite";

const app = express();

// Parse JSON request bodies so proxy requests can forward them correctly
app.use(express.json());

// Serve static files from the static directory for uploaded assets
app.use('/static', express.static(path.resolve(process.cwd(), 'static')));

// Proxy API requests to FastAPI backend
app.use('/api', async (req, res) => {
  try {
    const proxyUrl = `http://0.0.0.0:8000${req.originalUrl}`;

    const headers: Record<string, string> = {};
    for (const [key, value] of Object.entries(req.headers)) {
      if (value === undefined) continue;
      if (Array.isArray(value)) {
        headers[key] = value.join(',');
      } else {
        headers[key] = value;
      }
    }

    delete headers['content-length'];
    headers['host'] = '0.0.0.0:8000';

    const method = req.method ?? 'GET';
    const contentType = (headers['content-type'] || '').toLowerCase();
    const hasBody = method !== 'GET' && method !== 'HEAD';

    let body: BodyInit | undefined;
    let useStreamBody = false;

    if (hasBody) {
      if (contentType.startsWith('multipart/form-data') || contentType.startsWith('application/octet-stream')) {
        body = req as unknown as BodyInit;
        useStreamBody = true;
      } else if (Buffer.isBuffer(req.body)) {
        body = req.body;
      } else if (typeof req.body === 'string') {
        body = req.body;
      } else if (
        req.body !== undefined &&
        !(typeof req.body === 'object' && Object.keys(req.body).length === 0)
      ) {
        body = JSON.stringify(req.body);
        if (!headers['content-type']) {
          headers['content-type'] = 'application/json';
        }
      }
    }

    const fetchOptions: RequestInit & { duplex?: 'half' } = {
      method,
      headers,
      body,
    };

    if (useStreamBody) {
      fetchOptions.duplex = 'half';
    }

    const response = await fetch(proxyUrl, fetchOptions);

    // Copy status and headers
    res.status(response.status);
    const responseHeaders = response.headers as Headers & {
      getSetCookie?: () => string[];
    };
    const setCookies = responseHeaders.getSetCookie?.();
    if (setCookies && setCookies.length > 0) {
      res.setHeader('set-cookie', setCookies);
    }
    response.headers.forEach((value, key) => {
      const lowerKey = key.toLowerCase();
      if (lowerKey === 'set-cookie' || lowerKey === 'content-encoding') {
        return;
      }
      res.setHeader(key, value);
    });

    // Stream the response
    if (response.body) {
      const reader = response.body.getReader();
      
      const pump = async () => {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(Buffer.from(value));
        }
        res.end();
      };
      
      await pump();
    } else {
      res.end();
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log(`Proxy error: ${message}`);
    res.status(500).json({ error: 'Proxy error' });
  }
});

const server = createServer(app);

// Note: FastAPI backend should be started separately
// Run: uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

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
