import http from 'http';
import app from './app.js';

const PORT = process.env.PORT || 3000;
const ENV = process.env.NODE_ENV || 'development';
const server = http.createServer(app);

server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
