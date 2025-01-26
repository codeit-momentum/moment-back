import express from 'express';
<<<<<<< HEAD
import { getCompletedMomentsByDay, getHome } from '../controllers/homeControllers.js';
=======
import { getCompletedMomentsByDay, getCompletedMomentsByWeek, getHome, getNotifications, markNotificationAsRead, getBucketListStatus } from '../controllers/homeControllers.js';
>>>>>>> f3ab522baac8deff0cbff730f80fd8416fc20630
import { jwtMiddleware } from '../middlewares/jwtMiddlewares.js';
import { getAndMarkNotificationsAsRead } from '../controllers/notificationController.js';
// import { prismaMiddleware } from '../middlewares/prismaMiddlewares.js';

const router = express.Router();

// 인증 미들웨어 적용 (jwt 토큰)
router.use(jwtMiddleware);
// prisma 미들웨어 적용 
// router.use(prismaMiddleware);

router.get('', getHome); // 홈 목록 조회
router.patch('/notifications', getAndMarkNotificationsAsRead); // 알림 조회 및 읽음 처리  
// router.get('/momentsComplete/week', getCompletedMomentsByWeek); // 요일별 인증 확인 
router.get('/momentsComplete/day', getCompletedMomentsByDay); // 당일 인증 확인 
router.get('/bucket', getBucketListStatus); // 버킷리스트 달성 현황

export default router;