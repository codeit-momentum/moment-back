import http from 'http';
import WebSocket, { WebSocketServer } from 'ws';
import app from './app.js';
import { checkS3Connection } from './config/s3config.js';
import { sendUnreadNotificationsCount } from './controllers/notificationController.js';

const PORT = process.env.PORT || 3000;
const ENV = process.env.NODE_ENV || 'development';
const server = http.createServer(app);

// WebSocket 서버 추가
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
    console.log('New WebSocket client connected');

    // 클라이언트 연결 시 초기 알림 개수 전송 
    sendUnreadNotificationsCount(wss);

    ws.on('message', (message) => {
        console.log(`Received message: ${message}`);

        // 클라이언트에 응답 보내기
        ws.send(`Echo: ${message}`);
    });

    ws.on('close', () => {
        console.log('WebSocket client disconnected');
    });
});

setInterval(() => {
    sendUnreadNotificationsCount(wss);
}, 10000);

server.listen(PORT, async () => {
    console.log(`Server running on http://localhost:${PORT}`);
    await checkS3Connection(); // S3 연결 확인 
});