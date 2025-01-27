import { PrismaClient } from '@prisma/client'; // Prisma 클라이언트
import { subDays } from "date-fns";

const prisma = new PrismaClient(); 

export const getFriendFeed = async (req, res) => {
  try {
    const userID = req.user.userID;
    const friendID = req.params.friendID; // 요청 URL에서 친구 ID 가져오기

    // 1. 친구 관계 확인
    const friendRelation = await prisma.friend.findMany({
      where: {
        OR: [
          { userID, friendUserID: friendID },
          { userID: friendID, friendUserID: userID },
        ],
      },
    });

    if (friendRelation.length === 0) {
      return res.status(404).json({
        success: false,
        message: "친구 관계가 존재하지 않습니다.",
      });
    }

    // 2. 친구 정보 조회 (nickname 가져오기)
    const friend = await prisma.user.findUnique({
      where: {
        userID: friendID,
      },
      select: {
        nickname: true,
        friendCode: true,
      },
    });

    if (!friend) {
      return res.status(404).json({
        success: false,
        message: "친구 정보를 찾을 수 없습니다.",
      });
    }

    // 3. 친구의 반복형 버킷리스트 가져오기 (type이 REPEAT인 경우만)
    const buckets = await prisma.bucket.findMany({
        where: {
          user: { userID: friendID },
          type: "REPEAT",
        },
        select: {
          bucketID: true,
          type: true,
          content: true,
        },
      });
  
      const repeatBuckets = buckets.filter(
        (bucket) => bucket.type !== "ACHIEVEMENT"
      );

    // 반복형 버킷리스트가 없을 경우
    if (repeatBuckets.length === 0) {
    return res.status(404).json({
        success: false,
        message: "해당 친구의 반복형 버킷리스트가 존재하지 않습니다.",
    });
    }

    // 4. 반복형 버킷리스트의 완료된 모멘트 가져오기
    const sevenDaysAgo = subDays(new Date(), 7); // 7일 전 계산
    const moments = [];

    for (const bucket of repeatBuckets) {
      const bucketMoments = await prisma.moment.findMany({
        where: {
          bucketID: bucket.bucketID,
          isCompleted: true,
          updatedAt: {
            gte: sevenDaysAgo, // 7일 이내만 조회
          },
        },
        select: {
          photoUrl: true,
          updatedAt: true,
          momentID: true,
        },
        orderBy: {
          updatedAt: "desc", // 최신순 정렬
        },
      });

      // 모멘트 데이터 추가
      // `${nickname}님이 ${content} 목표를 유지 중이에요!` 와 같은 형식으로 활용 가능
      bucketMoments.forEach((moment) => {
        moments.push({
          momentId: moment.momentID,
          content: bucket.content,
          imageUrl: moment.photoUrl,
          date: moment.updatedAt,
        });
      });
    }

    // 완료된 모멘트가 없을 경우
    if (moments.length === 0) {
        return res.status(404).json({
        success: false,
        message: "7일 이내 완료된 모멘트가 존재하지 않습니다.",
        });
    }


    // 5. 모멘트 정렬 및 응답 반환
    moments.sort((a, b) => new Date(b.date) - new Date(a.date)); // 최신순 정렬

    return res.status(200).json({
      status: "success",
      friendCode: friend.friendCode,
      nickname: friend.nickname,
      moments,
    });
  } catch (error) {
    console.error("친구 피드 생성 오류:", error);
    return res.status(500).json({
      success: false,
      message: "서버 내부 오류가 발생했습니다.",
    });
  }
};
