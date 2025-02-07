import express from 'express';
import { getCompletedBucket, getCompletedMomentsByWeek, getConsecutiveCompletedDays, getHome } from '../controllers/homeControllers.js';
import { deleteNotification, getAndMarkNotificationsAsRead } from '../controllers/notificationController.js';
import { jwtMiddleware } from '../middlewares/jwtMiddlewares.js';

const router = express.Router();

// 인증 미들웨어 적용 (jwt 토큰)
router.use(jwtMiddleware);

router.get('/:date', getHome);                                                // 홈 당일 모먼트 조회
router.get('/consecutiveDays/:date',getConsecutiveCompletedDays);             // 연속적으로 인증한 날짜 조회 
router.get('/momentsComplete/week/:date', getCompletedMomentsByWeek);         // 일주일 인증 확인 

router.patch('/notifications', getAndMarkNotificationsAsRead);          // 알림 조회 및 읽음 처리  
router.delete('/notifications/:notificationID', deleteNotification);    // 알림 삭제 

router.get('/', getCompletedBucket);

export default router;