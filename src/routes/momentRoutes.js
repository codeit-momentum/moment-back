import express from 'express';
import { jwtMiddleware } from '../middlewares/jwtMiddlewares.js';
import { createBucket, deleteBucket, updateBucket } from '../controllers/bucketControllers.js';

const router = express.Router();

// 인증 미들웨어 적용 (jwt 토큰)
// router.use(jwtMiddleware);

router.post('/bucket', createBucket); // 버킷리스트 등록 
router.patch('/bucket/:bucketID', updateBucket); // 버킷리스트 수정 
router.delete('/bucket/:bucketID', deleteBucket); // 버킷리스트 삭제 



export default router;