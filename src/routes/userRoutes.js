import express from 'express';
import multer from 'multer';
import { jwtMiddleware } from '../middlewares/jwtMiddlewares.js';
import { getCurrentUser, updateNickname, updateProfileImage } from '../controllers/userControllers.js';

const router = express.Router();
const upload = multer(); 

// 인증 미들웨어 적용 (jwt 토큰)
router.use(jwtMiddleware);

// API 명세서 다 작성하지 않아서 경로명 임의로 정함함

router.get('/profile', getCurrentUser); // 현재 사용자 정보 반환
router.put('/profile/update-nickname', updateNickname); // 사용자 닉네임 업데이트
router.put('/profile/update-profileImage', upload.single('profileImage'), updateProfileImage); // 사용자 프로필 이미지 업데이트트

export default router;