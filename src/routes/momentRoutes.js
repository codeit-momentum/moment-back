import express from 'express';
import multer from 'multer';
import { activateBucketChallenge, createBucket, deactivateBucketChallenge, getBucketDetail, uploadAchievementPhoto } from '../controllers/bucketControllers.js';
import { createMoments, getMomentsByBucket, updateMoment } from '../controllers/momentControllers.js';
import { jwtMiddleware } from '../middlewares/jwtMiddlewares.js';

const router = express.Router();
const upload = multer();

// 인증 미들웨어 적용 (jwt 토큰)
router.use(jwtMiddleware);

router.post('/', createBucket); // 버킷리스트 등록 
router.patch('/:bucketID/achievement-photo', uploadAchievementPhoto.single('image'), uploadAchievementPhoto); // 버킷리스트 수정 
router.patch('/:bucketID/challenge', activateBucketChallenge);
router.patch('/:bucketID/un-challenge', deactivateBucketChallenge);
router.get('/:bucketID', getBucketDetail);

//모멘트 등록 조회(bucketID)
router.post('/moments/:bucketID/moments', createMoments);
router.get('/moments/:bucketID/moments', getMomentsByBucket);
router.patch('/moments/:momentID', upload.single('photoUrl'), updateMoment); //모멘트 달성


export default router;