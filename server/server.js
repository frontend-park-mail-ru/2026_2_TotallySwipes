import express from 'express';
import path from 'node:path';

const PORT = process.env.PORT ?? 8000;
const DIST = path.resolve(import.meta.dirname, '..', 'dist');

const app = express();

app.use(express.static(DIST));

app.use((req, res) => {
    res.sendFile(path.join(DIST, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server started: http://localhost:${PORT}`);
});
