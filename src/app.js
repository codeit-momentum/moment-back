import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import 'dotenv-flow/config';
import express from 'express';
import authRoutes from './routes/authRoutes.js';

dotenv.config({override: true});

const app = express();

// 미들웨어, 라우트 등등 (Express 애플리케이션 설정)
app.use(cors());
app.use(bodyParser.json());
app.use(cookieParser());
app.use('/auth', authRoutes);


export default app;