import express from 'express';
import kakaoLogin from '../controllers/authControllers';
const router = express.Router();

router.post('/kakao-login', kakaoLogin);

module.exports = router;