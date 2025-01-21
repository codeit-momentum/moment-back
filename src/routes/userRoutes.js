import express from 'express';
import multer from 'multer';
import { jwtMiddleware } from '../middlewares/jwtMiddlewares.js';
import { getCurrentUser, getUserFriendCode, updateNickname, updateProfileImage } from '../controllers/userControllers.js';

const router = express.Router();
const upload = multer(); 

// 인증 미들웨어 적용 (jwt 토큰)
router.use(jwtMiddleware);

router.get('/', getCurrentUser); // 현재 사용자 정보 반환
router.patch('/nickname', updateNickname); // 사용자 닉네임 업데이트
router.patch('/profileImage', upload.single('profileImage'), updateProfileImage); // 사용자 프로필 이미지 업데이트
router.get('/friendCode', getUserFriendCode); // 현재 사용자의 친구 코드 반환

export default router;