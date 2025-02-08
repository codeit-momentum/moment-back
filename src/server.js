import http from 'http';
import app from './app.js';
import { checkS3Connection } from './config/s3config.js';

const PORT = process.env.PORT || 3000;
const ENV = process.env.NODE_ENV || 'development';
const server = http.createServer(app);

server.listen(PORT, async () => {
    console.log(`Server running on http://localhost:${PORT}`);
    await checkS3Connection(); // S3 연결 확인 
});