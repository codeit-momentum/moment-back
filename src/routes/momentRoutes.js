import express from 'express';
import multer from 'multer';
import { activateBucketChallenge, createBucket, deactivateBucketChallenge, deleteBucket, getAchievementBuckets, getBucketDetail, getCompletedBuckets, getRepeatBuckets, updateBucket, uploadAchievementPhoto } from '../controllers/bucketControllers.js';
import { createMoments, getChallengingBucketCount, getChallengingBucketsAndMoments, getDetailMoment, getMomentsByBucket, updateMoment } from '../controllers/momentControllers.js';
import { jwtMiddleware } from '../middlewares/jwtMiddlewares.js';

const router = express.Router();
const upload = multer();

// 인증 미들웨어 적용 (jwt 토큰)
router.use(jwtMiddleware);

router.post('/', createBucket); // 버킷리스트 등록 
router.patch('/:bucketID/achievement-photo', upload.single('photoUrl'), uploadAchievementPhoto); // 버킷리스트 달성

router.patch('/:bucketID/challenge', activateBucketChallenge); // 도전리스트 활성화
router.patch('/:bucketID/un-challenge', deactivateBucketChallenge); // 혹시 몰라서 추가해둔 도전리스트 취소

router.get('/completed-count', getCompletedBuckets); // 완료된 버킷리스트 갯수(홈 화면 이용)
router.get('/:bucketID', getBucketDetail); // 버킷리스트 상세 조회
router.patch('/:bucketID', updateBucket); // 버킷 이름 수정
router.get('/all/repeat', getRepeatBuckets); // 반복형 버킷 목록 조회
router.get('/all/achievement', getAchievementBuckets); // 달성형 버킷 목록 조회
router.delete('/:bucketID', deleteBucket); // 버킷 삭제

//모멘트 등록 조회(bucketID)
router.post('/moments/:bucketID', createMoments);
router.get('/moments/:bucketID', getMomentsByBucket); // (반복형) 버킷리스트의 모멘트들 조회
router.get('/moment/:momentID', getDetailMoment); // 선택한 모멘트의 상세 조회
router.patch('/moments/:momentID', upload.single('photoUrl'), updateMoment); //모멘트 달성
router.get('/challenging/count', getChallengingBucketCount);

// 도전중인 버킷과 모멘트 조회(모멘트 메인화면)
router.get('/challenging/main', getChallengingBucketsAndMoments);

export default router;