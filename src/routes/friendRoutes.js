import express from 'express';
import { addFriend, checkFriendCode, cheerOnFriendFeed, deleteFriend, getFriends, knockFriend, toggleFriendFix } from '../controllers/friendControllers.js';
import { jwtMiddleware } from '../middlewares/jwtMiddlewares.js';

const router = express.Router();

// 인증 미들웨어 적용 (jwt 토큰)
router.use(jwtMiddleware);

// API 명세서 다 작성하지 않아서 경로명 임의로 정함

router.get('/', getFriends); // 친구 목록 조회
router.post('/', addFriend); // 친구 추가
router.post('/check-friendCode', checkFriendCode); // 친구 코드 확인
router.delete('/', deleteFriend); // 친구 삭제
router.post('/knock', knockFriend); // 친구 노크하기
router.post('/cheer/:friendId/:momentId', cheerOnFriendFeed); // 친구 응원하기
router.patch('/fixed', toggleFriendFix); // 친구 고정/고정 해제하기

export default router;