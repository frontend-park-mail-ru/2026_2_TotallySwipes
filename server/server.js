import express from 'express';
import path from 'node:path';

const PORT = process.env.PORT ?? 8000;
const ROOT = path.resolve(import.meta.dirname, '..');

const app = express();

app.use('/public', express.static(path.join(ROOT, 'public')));
app.use('/src', express.static(path.join(ROOT, 'src')));

app.use((req, res) => {
    res.sendFile(path.join(ROOT, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`Server started: http://localhost:${PORT}`);
});
