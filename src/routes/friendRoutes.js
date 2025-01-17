import express from 'express';
import { jwtMiddleware } from '../middlewares/jwtMiddlewares.js';
import { addFriendRequest, getFriendRequests, getFriends, handleFriendRequest } from '../controllers/friendControllers.js';

const router = express.Router();

// 인증 미들웨어 적용 (jwt 토큰)
router.use(jwtMiddleware);

// API 명세서 다 작성하지 않아서 경로명 임의로 정함

router.get('/', getFriends); // 친구 목록 조회
router.post('/', addFriendRequest); // 친구 추가
router.get('/requests', getFriendRequests); // 친구 요청 목록 조회
router.patch('/requests/:friendRequestID', handleFriendRequest); // 친구 요청 수락/거절

export default router;