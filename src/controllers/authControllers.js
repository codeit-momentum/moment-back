import { PrismaClient } from '@prisma/client';
import { generateAccessToken, generateRefreshToken } from './jwtControllers.js';
import axios from 'axios';

const prisma = new PrismaClient();


// 카카오 로그인 페이지로 리디렉션 (프론트에서 하는 작업) (테스트용)
export const redirectToKakaoLogin = (req, res) => {
    const kakaoAuthUrl = `https://kauth.kakao.com/oauth/authorize?response_type=code&client_id=${process.env.REST_API_KEY}&redirect_uri=${process.env.REDIRECT_URI}`;
    res.redirect(kakaoAuthUrl); // 사용자 브라우저를 카카오 로그인 페이지로 리디렉션
};

// 인가 코드 콜백 처리 (프론트에서 하는 작업) (테스트용)
export const handleKakaoCallback = (req, res) => {
    const { code } = req.query;

    if (!code) {
        return res.status(400).send('Authorization code not provided');
    }

    // 받은 인가 코드를 클라이언트로 반환하거나 액세스 토큰 요청으로 연결
    res.json({ authorization_code: code });
};


export const kakaoLogin = async (req, res) => {
    const { code } = req.body; // 클라이언트에서 받은 인가 코드

    try {
        const response = await axios.post('https://kauth.kakao.com/oauth/token', null, {
            params: {
            grant_type: 'authorization_code',
            client_id: process.env.REST_API_KEY,
            redirect_uri: process.env.REDIRECT_URI,
            code: code,
            },
        });

        const { access_token } = response.data;

        res.json({ access_token }); // 클라이언트로 액세스 토큰 반환
    } catch (error) {
        console.error("카카오 액세스 토큰 요청 실패: ", error.response?.data || error.message);
        res.status(500).send('Token request failed');
    }
};

// 카카오 사용자 정보 가져오기
export const getKakaoUser = async (accessToken) => {
    try {
        // 액세스 토큰을 사용하여 카카오 사용자 정보를 가져옴
        const response = await axios.get('https://kapi.kakao.com/v2/user/me', {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });

        return response.data; // 사용자 정보 반환
    } catch (error) {
        console.error('카카오 사용자 정보 요청 실패:', error.response?.data || error.message);
        throw new Error('Failed to retrieve user info');
    }
};

// 랜덤 4자리 문자열(대문자) + 4자리 숫자를 생성 
const generateFriendCode = () => {
    const randomLetters = Array.from({ length: 4 }, () => 
        String.fromCharCode(65 + Math.floor(Math.random() * 26)) // A-Z
    ).join('');
    const randomNumbers = Array.from({ length: 4 }, () => 
        Math.floor(Math.random() * 10) // 0-9
    ).join('');
    return `${randomLetters}${randomNumbers}`; // 조합된 코드 반환
};

// 카카오 사용자 처리 (데이터베이스 저장/조회) + (JWT 토큰 발급)
export const handleKakaoUser = async (req, res) => {
    const { kakaoAccessToken } = req.body; // 클라이언트에서 받은 액세스 토큰

    try {
        // 카카오 사용자 정보 가져오기기
        const userInfo = await getKakaoUser(kakaoAccessToken);

        const { id: kakaoId, kakao_account } = userInfo; // 카카오 사용자 ID 및 계정 정보
        //const email = kakao_account.email;
        const email = "kangyeon9525@kakao.com"; // 임시 이메일 (테스트용)

        // 데이터베이스에서 사용자 확인 또는 새 사용자 생성
        let user = await prisma.user.findUnique({ where: { email } });
        
        if (!user) {
            // 친구 코드 생성 (중복되지 않도록 반복 시도)
            let friendCode;
            while (true) {
                friendCode = generateFriendCode(); // 랜덤 코드 생성
                const existingUser = await prisma.user.findUnique({ where: { friendCode } });
                if (!existingUser) break; // 고유 코드 확인
            }

            // 사용자가 없으면 새로 생성
            user = await prisma.user.create({
                data: {
                    email, // 사용자 이메일일
                    kakaoId: kakaoId.toString(), // 카카오 ID => 문자열
                    friendCode, // 친구 코드
                },
            });
        }

        // JWT 토큰 생성
        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);

        // Refresh Token을 HttpOnly 쿠키에 저장
        res.cookie('refreshToken', refreshToken, { httpOnly: true, secure: false, sameSite: 'strict' });

        // 사용자 정보 + JWT 토큰 반환
        res.json({ 
            user: {
                id: user.id,
                email: user.email,
                kakaoId: user.kakaoId,
                friendCode: user.friendCode,
            },
            accessToken
        });
    } catch (error) {
        console.error('사용자 처리 실패:', error.message);
        res.status(500).send('Failed to process user');
    }
};