import express from 'express';
import fs from 'node:fs';
import http from 'node:http';
import https from 'node:https';
import path from 'node:path';

const PORT = process.env.PORT ?? 8000;
const { TLS_CERT_FILE, TLS_KEY_FILE } = process.env;
const DIST = path.resolve(import.meta.dirname, '..', 'dist');

const app = express();

app.use(express.static(DIST));

app.use((req, res) => {
    res.sendFile(path.join(DIST, 'index.html'));
});

const isHttps = Boolean(TLS_CERT_FILE && TLS_KEY_FILE);

const server = isHttps
    ? https.createServer(
          {
              cert: fs.readFileSync(TLS_CERT_FILE),
              key: fs.readFileSync(TLS_KEY_FILE),
          },
          app,
      )
    : http.createServer(app);

server.listen(PORT, () => {
    console.log(`Server started: ${isHttps ? 'https' : 'http'}://localhost:${PORT}`);
});
