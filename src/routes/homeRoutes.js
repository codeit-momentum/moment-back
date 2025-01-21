import express from 'express';
import { getCompletedMomentsByDay, getCompletedMomentsByWeek, getHome, getNotifications, markNotificationAsRead, getBucketListStatus } from '../controllers/homeControllers.js';
import { jwtMiddleware } from '../middlewares/jwtMiddlewares.js';
import { prismaMiddleware } from '../middlewares/prismaMiddlewares.js';

const router = express.Router();

// 인증 미들웨어 적용 (jwt 토큰)
router.use(jwtMiddleware);
// prisma 미들웨어 적용 
router.use(prismaMiddleware);

router.get('/home', getHome); // 홈 목록 조회
router.get('/home/notifications', getNotifications); // 알림 목록 조회 및 새 알림 표시
router.patch('/home/notifications/{notificationsID}', markNotificationAsRead); // 알림 읽음 수정 
router.get('/home/momentsComplete/week', getCompletedMomentsByWeek); // 요일별 인증 확인 
router.get('/home/momentsComplete/day', getCompletedMomentsByDay); // 당일 인증 확인 
router.get('/home/bucket', getBucketListStatus); // 버킷리스트 달성 현황

export default router;