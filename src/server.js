import http from 'http';
import WebSocket, { WebSocketServer } from 'ws';
import url from 'url';
import app from './app.js';
import { checkS3Connection } from './config/s3config.js';
import { sendUnreadNotificationsCount } from './controllers/notificationController.js';

const PORT = process.env.PORT || 3000;
const ENV = process.env.NODE_ENV || 'development';
const server = http.createServer(app);

// WebSocket 서버 추가
const wss = new WebSocketServer({ server });
const connectedUserIDs = new Set();        // userID 저장 

wss.on('connection', (ws, req) => {
    const params = url.parse(req.url, true).query;
    const userID = params.userID;

    if (!userID) {
        ws.send(JSON.stringify({ error: 'userID is required' }));
        ws.close();
        return;
    }

    console.log(`New WebSocket client connected with userID: ${userID}`);

    // 연결된 사용자 저장
    connectedUserIDs.add(userID);

    // 클라이언트 연결 시 초기 알림 개수 전송 
    sendUnreadNotificationsCount(userID, wss);

    ws.on('message', (message) => {
        console.log(`Received message: ${message}`);

        // 클라이언트에 응답 보내기
        ws.send(`Echo: ${message}`);
    });

    ws.on('close', () => {
        console.log('WebSocket client disconnected');
    });
});

// 모든 연결된 사용자에 대해 주기적으로 알림 개수 전송
setInterval(() => {
    connectedUserIDs.forEach(async (userID) => {
        await sendUnreadNotificationsCount(userID, wss);
    });
}, 10000);

server.listen(PORT, async () => {
    console.log(`Server running on http://localhost:${PORT}`);
<<<<<<< HEAD
    await checkS3Connection(); // S3 연결 확인 
=======
    await checkS3Connection(); // S3 연결 확인인
>>>>>>> f3ab522baac8deff0cbff730f80fd8416fc20630
});