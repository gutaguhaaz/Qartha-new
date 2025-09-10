import express from "express";
import { createServer } from "http";
import { spawn } from "child_process";
import path from "path";
import { serveStatic, log } from "./vite";

const app = express();

// Serve static files from the static directory for uploaded assets
app.use('/static', express.static(path.resolve(process.cwd(), 'static')));

// Proxy API requests to FastAPI backend
app.use('/api', (req, res) => {
  const proxyUrl = `http://localhost:8000${req.originalUrl}`;
  
  fetch(proxyUrl, {
    method: req.method,
    headers: req.headers as HeadersInit,
    body: req.method === 'GET' || req.method === 'HEAD' ? undefined : JSON.stringify(req.body)
  })
  .then(response => {
    res.status(response.status);
    response.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });
    return response.body;
  })
  .then(body => {
    if (body) {
      body.pipeTo(new WritableStream({
        write(chunk) {
          res.write(chunk);
        },
        close() {
          res.end();
        }
      }));
    } else {
      res.end();
    }
  })
  .catch(error => {
    log(`Proxy error: ${error.message}`);
    res.status(500).json({ error: 'Proxy error' });
  });
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
