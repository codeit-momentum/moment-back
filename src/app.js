import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import 'dotenv-flow/config';
import express from 'express';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import friendRoutes from './routes/friendRoutes.js';
import homeRoutes from "./routes/homeRoutes.js";
import momentRoutes from "./routes/momentRoutes.js";


dotenv.config({override: true});

const app = express();

const corsOptions = {
  origin: [
    'http://localhost:5173', // 프론트엔드 로컬 환경
    'https://codeit.momentum.vercel.app', // 프론트엔드 배포 환경
  ],
  credentials: true, // 쿠키 및 인증 헤더 허용
}

// 미들웨어, 라우트 등등 (Express 애플리케이션 설정)
app.use(cors(corsOptions));
app.use(bodyParser.json());
app.use(cookieParser());
app.use('/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/home', homeRoutes);
app.use('/api/moment', momentRoutes);

console.log('Current Environment:', process.env.NODE_ENV);
console.log('Redirect URI:', process.env.REDIRECT_URI);
console.log('REST_API_KEY:', process.env.REST_API_KEY);

export default app;