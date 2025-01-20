import express from 'express';
import { addFriend, cheerOnFriendFeed, deleteFriend, getFriends, knockFriend } from '../controllers/friendControllers.js';
import { jwtMiddleware } from '../middlewares/jwtMiddlewares.js';

const router = express.Router();

// 인증 미들웨어 적용 (jwt 토큰)
router.use(jwtMiddleware);

// API 명세서 다 작성하지 않아서 경로명 임의로 정함

router.get('/', getFriends); // 친구 목록 조회
router.post('/', addFriend); // 친구 추가
router.delete('/', deleteFriend); // 친구 삭제제
router.post('/knock', knockFriend); // 친구 노크하기
router.post('/cheer/:feedId', cheerOnFriendFeed); // 친구 응원하기

export default router;