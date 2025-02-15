import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import 'dotenv-flow/config';
import express from 'express';
import authRoutes from './routes/authRoutes.js';
import feedRoutes from './routes/feedRoutes.js';
import friendRoutes from './routes/friendRoutes.js';
import homeRoutes from "./routes/homeRoutes.js";
import momentRoutes from "./routes/momentRoutes.js";
import userRoutes from './routes/userRoutes.js';

dotenv.config({override: true});

const app = express();

const corsOptions = {
  origin: [
    'http://localhost:5173', // 프론트엔드 로컬 환경
    'https://codeit-momentum.vercel.app', // 프론트엔드 배포 환경
    'https://www.codeit-momentum.shop',
  ],
  credentials: true, // 쿠키 및 인증 헤더 허용
  allowedHeaders: ['Content-Type', 'Authorization', 'x-access-token'],
  exposedHeaders: ['x-access-token'],
}

// 미들웨어, 라우트 등등 (Express 애플리케이션 설정)
app.use(cors(corsOptions));
app.use(bodyParser.json());
app.use(cookieParser());
app.use('/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/home', homeRoutes);
app.use('/api/bucket', momentRoutes);
app.use('/api/feed', feedRoutes);

console.log('Current Environment:', process.env.NODE_ENV);
console.log('Redirect URI LOCAL:', process.env.REDIRECT_URI_LOCAL);
console.log('Redirect URI DEPLOY:', process.env.REDIRECT_URI_DEPLOY);
console.log('REST_API_KEY:', process.env.REST_API_KEY);

export default app;