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
  if (!refreshToken) {
    throw new Error('Refresh Token이 필요합니다.');
  }

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user) {
      throw new Error('사용자를 찾을 수 없습니다.');
    }

    // 새로운 Access Token 발급
    const newAccessToken = generateAccessToken(user);
    return newAccessToken;
  } catch (err) {
    throw new Error('유효하지 않은 Refresh Token입니다.');
  }
};