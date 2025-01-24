import express from 'express';
import multer from 'multer';
import { createBucket, deleteBucket, updateBucket } from '../controllers/bucketControllers.js';
import { createMoments, getMomentsByBucket, updateMoment } from '../controllers/momentControllers.js';
import { jwtMiddleware } from '../middlewares/jwtMiddlewares.js';

const router = express.Router();
const upload = multer();

// 인증 미들웨어 적용 (jwt 토큰)
router.use(jwtMiddleware);

router.post('/bucket', createBucket); // 버킷리스트 등록 
router.patch('/bucket/:bucketID', updateBucket); // 버킷리스트 수정 
router.delete('/bucket/:bucketID', deleteBucket); // 버킷리스트 삭제 

//모멘트 등록 조회(bucketID)
router.post('/buckets/:bucketID/moments', createMoments);
router.get('/buckets/:bucketID/moments', getMomentsByBucket);
router.patch('/moments/:momentID', upload.single('photoUrl'), updateMoment); //모멘트 달성


export default router;