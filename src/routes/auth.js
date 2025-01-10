import express from 'express';
import { kakaoLogin } from '../controllers/authControllers.js';
const router = express.Router();

router.post('/kakao-login', kakaoLogin);

export default router;