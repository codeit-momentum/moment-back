import express from 'express';
import { getCompletedBucket, getCompletedMomentsByWeek, getConsecutiveCompletedDays, getHome } from '../controllers/homeControllers.js';
import { jwtMiddleware } from '../middlewares/jwtMiddlewares.js';
import { deleteNotification, getAndMarkNotificationsAsRead, longPollingNotifications } from '../controllers/notificationControllers.js';

const router = express.Router();

// 인증 미들웨어 적용 (jwt 토큰)
router.use(jwtMiddleware);

router.get('/', getHome);                                                // 홈 당일 모먼트 조회
router.get('/consecutiveDays',getConsecutiveCompletedDays);             // 연속적으로 인증한 날짜 조회 (작심 N일일)
router.get('/momentsComplete/week', getCompletedMomentsByWeek);         // 일주일 인증 확인 

router.patch('/notifications', getAndMarkNotificationsAsRead);          // 알림 조회 및 읽음 처리 
router.get('/notifications/unreadCount', longPollingNotifications); 
router.delete('/notifications/:notificationID', deleteNotification);    // 알림 삭제 

router.get('/', getCompletedBucket);                                    // 버킷리스트 달성 현황 조회 

export default router;