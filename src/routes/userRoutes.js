import express from 'express';
import multer from 'multer';
import { jwtMiddleware } from '../middlewares/jwtMiddlewares.js';
import { deleteUser, getCurrentUser, getUserFriendCode, updateNickname, updateProfile, updateProfileImage } from '../controllers/userControllers.js';

const router = express.Router();
const upload = multer(); 

// 인증 미들웨어 적용 (jwt 토큰)
router.use(jwtMiddleware);

router.get('/', getCurrentUser); // 현재 사용자 정보 반환
router.patch('/nickname', updateNickname); // 사용자 닉네임 업데이트
router.patch('/profileImage', upload.single('profileImage'), updateProfileImage); // 사용자 프로필 이미지 업데이트
router.patch('/profile', upload.single('profileImage'), updateProfile); // 닉네임 및 프로필 이미지 업데이트
router.get('/friendCode', getUserFriendCode); // 현재 사용자의 친구 코드 반환
router.delete('/', deleteUser); // 현재 사용자 회원탈퇴퇴

export default router;