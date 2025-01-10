import dotenv from 'dotenv';

dotenv.config();

const app = express();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const authRoutes = require('./routes/auth');

// 미들웨어, 라우트 등등 (Express 애플리케이션 설정)
app.use(cors());
app.use(bodyParser.json());
app.use('/auth', authRoutes);


export default app;