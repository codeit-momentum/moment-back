import express from 'express';
import { redirectToKakaoLogin, handleKakaoCallback, handleKakaoUser, kakaoLogin } from '../controllers/authControllers.js';
import { jwtMiddleware } from '../middlewares/jwtMiddlewares.js';
const router = express.Router();


router.get('/kakao', redirectToKakaoLogin); // 카카오 로그인 페이지로 리디렉션 (프론트에서 하는 작업) (테스트용)
router.get('/kakao/callback', handleKakaoCallback); // 카카오에서 인가 코드를 수신하는 콜백 URL (프론트에서 하는 작업) (테스트용)

router.post('/kakao-login', kakaoLogin); // 카카오 액세스 토큰 요청
router.post('/kakao-login/user', handleKakaoUser); // 카카오 사용자 정보 처리

// jwtMiddleware 테스트용
router.get('/profile', jwtMiddleware, (req, res) => {
  res.json({
    message: '프로필 조회 성공',
    user: req.user, // jwtMiddleware에서 설정한 사용자 정보
  });
});

export default router;