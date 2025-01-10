import express from 'express';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

// 미들웨어, 라우트 등등 (Express 애플리케이션 설정)
app.get('/', (req, res) => {
  res.send('Hello, World!');
});

export default app;