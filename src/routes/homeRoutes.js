import express from 'express';
import { getCompletedMomentsByWeek, getConsecutiveCompletedDays, getHome } from '../controllers/homeControllers.js';
import { jwtMiddleware } from '../middlewares/jwtMiddlewares.js';
import { getAndMarkNotificationsAsRead } from '../controllers/notificationController.js';

const router = express.Router();

// 인증 미들웨어 적용 (jwt 토큰)
router.use(jwtMiddleware);

router.get('', getHome); // 홈 당일 모먼트 조회
router.get('/consecutiveDays',getConsecutiveCompletedDays);     // 연속적으로 인증한 날짜 조회
router.patch('/notifications', getAndMarkNotificationsAsRead);  // 알림 조회 및 읽음 처리   
router.get('/momentsComplete/week', getCompletedMomentsByWeek); // 당일 인증 확인 

export default router;