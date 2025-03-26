import { PutObjectCommand } from '@aws-sdk/client-s3';
import { PrismaClient } from '@prisma/client';
import { s3Client } from '../config/s3config.js';

const prisma = new PrismaClient();

// 현재 사용자 정보 조회
export const getCurrentUser = async (req, res) => {
  try {
    // 현재 요청한 유저 정보 조회
    const currentUser = await prisma.user.findUnique({
      where: { userID: req.user.userID },
    });

    if (!currentUser) { // 현재 사용자가 없는 경우
      return res.status(404).json({ message: '현재 사용자를 찾을 수 없습니다.' });
    }

    // 사용자 정보 반환
    res.status(200).json({
      message: '사용자 프로필 접근 성공',
      user: currentUser
    });
  } catch (err) {
    console.error('getCurrentUser 오류:', err.message);
    res.status(500).json({ message: '사용자 정보를 가져오는 데 실패했습니다.' });
  }
};

// 현재 사용자 친구 코드 조회
export const getUserFriendCode = async (req, res) => {
  try {
    // 현재 요청한 유저 정보 조회
    const currentUser = await prisma.user.findUnique({
      where: { userID: req.user.userID },
    });

    if (!currentUser) { // 현재 사용자가 없는 경우
      return res.status(404).json({ message: '현재 사용자를 찾을 수 없습니다.' });
    }

    // 사용자 정보 반환
    res.status(200).json({
      message: '사용자의 친구 코드 접근 성공',
      friendCode: currentUser.friendCode
    });
  } catch (err) {
    console.error('getUserFriendCode 오류:', err.message);
    res.status(500).json({ message: '사용자의 친구 코드를 가져오는 데 실패했습니다.' });
  }
};

// 사용자 닉네임 업데이트
export const updateNickname = async (req, res) => {
  try {
    const { newNickname } = req.body;

    if (!newNickname) {
      return res.status(400).json({ message: '새 닉네임이 필요합니다.' });
    }

    if (newNickname.length > 20) { // 최대 글자 개수 (*논의 필요*)
      return res.status(400).json({ message: '닉네임은 최대 20자까지 가능합니다.' });
    }

    // 현재 사용자 업데이트
    const updatedUser = await prisma.user.update({
      where: { userID: req.user.userID },
      data: { nickname: newNickname },
      select: {
        userID: true,
        nickname: true,
        email: true,
        profileImageUrl: true,
      },
    });

    res.status(200).json({
      message: '닉네임이 성공적으로 변경되었습니다.',
      user: updatedUser,
    });
  } catch (err) {
    console.error('닉네임 변경 오류:', err.message);
    res.status(500).json({ message: '닉네임 변경 중 오류가 발생했습니다.' });
  }
};

// 사용자 프로필 사진 업데이트
export const updateProfileImage = async (req, res) => {
  try {
    if (!req.file) {
      // 파일이 없는 경우, 기존 프로필 이미지 URL 유지
      const currentUser = await prisma.user.findUnique({
        where: { userID: req.user.userID },
      });

      if (!currentUser) {
        return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
      }

      return res.status(200).json({
        message: '이미지를 업로드하지 않아 기존 프로필 이미지를 유지합니다.',
        user: currentUser,
      });
    }

    const bucketName = process.env.AWS_S3_BUCKET_NAME;
    const key = `profile/custom/${req.user.userID}/${req.user.userID}-${Date.now()}`;

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: req.file.buffer, // Multer는 파일 데이터를 buffer로 제공
      ContentType: req.file.mimetype, // 파일의 MIME 타입
    });

    await s3Client.send(command);

    const profileImageUrl = `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

    const updatedUser = await prisma.user.update({
      where: { userID: req.user.userID },
      data: { profileImageUrl: profileImageUrl },
    });

    res.status(200).json({
      message: '프로필 이미지가 성공적으로 업데이트되었습니다.',
      user: updatedUser,
    });
  } catch (err) {
    console.error('프로필 이미지 업데이트 오류:', err.message);
    res.status(500).json({ message: '프로필 이미지 업데이트 중 오류가 발생했습니다.' });
  }
}

// 사용자 닉네임 & 프로필 이미지 업데이트
export const updateProfile = async (req, res) => {
  try {
    const { newNickname } = req.body; // 새 닉네임
    let profileImageUrl = null; // 프로필 이미지 URL 초기화

    if (!newNickname) {
      return res.status(400).json({ message: '새 닉네임이 필요합니다.' });
    }

    // 닉네임 검증
    if (newNickname && newNickname.length > 20) {
      return res.status(400).json({ message: '닉네임은 최대 20자까지 가능합니다.' });
    }

    // 프로필 이미지 처리
    if (req.file) {
      const bucketName = process.env.AWS_S3_BUCKET_NAME;
      const key = `profile/custom/${req.user.userID}/${req.user.userID}-${Date.now()}`;

      const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: req.file.buffer, // Multer는 파일 데이터를 buffer로 제공
        ContentType: req.file.mimetype, // 파일의 MIME 타입
      });

      await s3Client.send(command);
      profileImageUrl = `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
    }

    // 사용자 정보 업데이트
    const updatedData = {};
    if (newNickname) updatedData.nickname = newNickname; // 닉네임 업데이트
    if (profileImageUrl) updatedData.profileImageUrl = profileImageUrl; // 프로필 이미지 업데이트

    if (Object.keys(updatedData).length === 0) {
      return res.status(400).json({ message: '변경할 닉네임 또는 프로필 이미지를 제공해주세요.' });
    }

    const updatedUser = await prisma.user.update({
      where: { userID: req.user.userID },
      data: updatedData,
      select: {
        userID: true,
        nickname: true,
        email: true,
        profileImageUrl: true,
      },
    });

    res.status(200).json({
      message: '사용자 정보가 성공적으로 업데이트되었습니다.',
      user: updatedUser,
    });
  } catch (err) {
    console.error('사용자 정보 업데이트 오류:', err.message);
    res.status(500).json({ message: '사용자 정보 업데이트 중 오류가 발생했습니다.' });
  }
}

// 사용자 회원탈퇴
export const deleteUser = async (req, res) => {
  try {
    // 현재 요청한 사용자 조회
    const userID = req.user.userID;


    // 사용자 삭제 (연관된 데이터 Cascade로 삭제)
    await prisma.$transaction(async (tx) => {
      await tx.notification.deleteMany({
        where: { userID: userID }
      });
      // 1️⃣ 친구 관계 삭제 (user가 포함된 모든 Friend 관계 삭제)
      await tx.friend.deleteMany({
        where: {
          OR: [
            { userID: userID },
            { friendUserID: userID }
          ]
        }
      });
      await tx.friendFeed.deleteMany({
        where: { userID: userID }
      });

      // 2️⃣ 모멘트 삭제 (해당 사용자가 생성한 모든 모멘트 삭제)
      await tx.moment.deleteMany({
        where: { userID: userID }
      });

      // 3️⃣ 버킷리스트 삭제 (해당 사용자가 생성한 모든 버킷 삭제)
      await tx.bucket.deleteMany({
        where: { userID: userID }
      });

      // 4️⃣ 사용자 삭제
      await tx.user.delete({
        where: { userID: userID }
      });
    });


    res.status(200).json({
      message: '회원 탈퇴가 성공적으로 완료되었습니다.',
    });
  } catch (err) {
    console.error('회원탈퇴 오류:', err.message);
    res.status(500).json({ message: '회원탈퇴 중 오류가 발생했습니다.' });
  }
}