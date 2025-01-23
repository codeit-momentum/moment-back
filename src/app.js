import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import 'dotenv-flow/config';
import express from 'express';
import authRoutes from './routes/authRoutes.js';
import friendRoutes from './routes/friendRoutes.js';
import homeRoutes from "./routes/homeRoutes.js";
import momentRoutes from "./routes/momentRoutes.js";
import userRoutes from './routes/userRoutes.js';


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
// 쿠키 설정
app.use((req, res, next) => {
  res.cookie('refreshToken', 'your_refresh_token_value', {
    httpOnly: true, // 클라이언트에서 JavaScript로 쿠키에 접근할 수 없도록 설정
    secure: process.env.NODE_ENV === 'production', // HTTPS 환경에서만 Secure 쿠키 사용
    sameSite: 'None', // 크로스사이트 쿠키 허용
  });
  next();
});
app.use('/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/home', homeRoutes);
app.use('/api/moment', momentRoutes);

console.log('Current Environment:', process.env.NODE_ENV);
console.log('Redirect URI LOCAL:', process.env.REDIRECT_URI_LOCAL);
console.log('Redirect URI DEPLOY:', process.env.REDIRECT_URI_DEPLOY);
console.log('REST_API_KEY:', process.env.REST_API_KEY);

export default app;