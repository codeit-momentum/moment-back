import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import authRoutes from './routes/auth.js';

dotenv.config({override: true});

const app = express();

// 미들웨어, 라우트 등등 (Express 애플리케이션 설정)
app.use(cors());
app.use(bodyParser.json());
app.use('/auth', authRoutes);


export default app;