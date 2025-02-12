import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// JWT 액세스 토큰 생성
export const generateAccessToken = (user) => {
  return jwt.sign(
    { userId: user.id, email: user.email, iat: Math.floor(Date.now() / 1000) },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRATION } // 액세스 토큰 만료 시간 (1시간)
  );
};

// JWT 리프래쉬 토큰 생성
export const generateRefreshToken = (user) => {
  return jwt.sign({ userId: user.id, email: user.email }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRATION  // 리프래쉬 토큰 만료 시간 (7일)
  });
};


// JWT 액세스 토큰 갱신
export const refreshAccessToken = async (req) => {
  const refreshToken = req.cookies.refreshToken;
  console.log("받은 리프래시 토큰:", refreshToken); // 리프래시 토큰 확인
  if (!refreshToken) {
    throw new Error('Refresh Token이 필요합니다.');
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    console.log("디코딩된 리프래시 토큰 정보:", decoded); // 디코딩 정보 확인
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user) {
      throw new Error('사용자를 찾을 수 없습니다.');
    }

    // 새로운 Access Token 발급
    const newAccessToken = generateAccessToken(user);
    console.log("새로운 액세스 토큰:", newAccessToken); // 새로운 토큰 확인
    return newAccessToken;
  } catch (err) {
    console.log("리프래시 토큰 검증 실패:", err);
    throw new Error('유효하지 않은 Refresh Token입니다.');
  }
};