import express from "express";
import { createServer } from "http";
import { spawn } from "child_process";
import path from "path";
import { serveStatic, log } from "./vite";

const app = express();

// Serve static files from the static directory for uploaded assets
app.use('/static', express.static(path.resolve(process.cwd(), 'static')));

// Proxy API requests to FastAPI backend
app.use('/api', async (req, res) => {
  try {
    const proxyUrl = `http://0.0.0.0:8000${req.originalUrl}`;
    
    const response = await fetch(proxyUrl, {
      method: req.method,
      headers: {
        'content-type': req.headers['content-type'] || 'application/json',
        'authorization': req.headers['authorization'] || '',
        'host': '0.0.0.0:8000'
      } as HeadersInit,
      body: req.method === 'GET' || req.method === 'HEAD' ? undefined : JSON.stringify(req.body)
    });

    // Copy status and headers
    res.status(response.status);
    response.headers.forEach((value, key) => {
      if (key.toLowerCase() !== 'content-encoding') {
        res.setHeader(key, value);
      }
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
    const errorMessage = error instanceof Error ? error.message : 'Unknown proxy error';
    log(`Proxy error: ${errorMessage}`);
    res.status(500).json({ error: 'Proxy error' });
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
