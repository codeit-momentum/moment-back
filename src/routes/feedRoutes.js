import express from 'express';
import { getFriendFeed } from '../controllers/feedControllers.js';
import { jwtMiddleware } from '../middlewares/jwtMiddlewares.js';

const router = express.Router();

// 인증 미들웨어 적용 (jwt 토큰)
router.use(jwtMiddleware);

router.get('/:friendID', getFriendFeed); 

export default router;