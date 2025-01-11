import { PrismaClient } from '@prisma/client';

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

        /*
        let user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            user = await prisma.user.create({ data: { email } });
        }*/

        res.json({ access_token }); // 클라이언트로 액세스 토큰 반환
        //res.json(response.data);
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
}

// 카카오 사용자 처리 (데이터베이스 저장/조회)
export const handleKakaoUser = async (req, res) => {
    const { accessToken } = req.body; // 클라이언트에서 받은 액세스 토큰

    try {
        const userInfo = await getKakaoUser(accessToken);

        const { id: kakaoId, kakao_account } = userInfo; // 카카오 사용자 ID 및 계정 정보
        //const email = kakao_account.email;
        const email = "kangyeon9525@kakao.com"; // 임시 이메일 (테스트용)

        // 데이터베이스에서 사용자 확인 또는 새 사용자 생성
        let user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            // 사용자가 없으면 새로 생성
            user = await prisma.user.create({
                data: {
                    email, // 사용자 이메일일
                    kakaoId: kakaoId.toString(), // 카카오 ID => 문자열열
                },
            });
        }

        // 사용자 정보 반환환
        res.json({ user });
    } catch (error) {
        console.error('사용자 처리 실패:', error.message);
        res.status(500).send('Failed to process user');
    }
}