import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 홈 조회
export const getHome = async (req, res) => {
    try {
      // 현재 인증된 사용자 정보 가져오기
      const userID = req.user.userID; // 현재 사용자 ID

      // 현재 사용자 조회
      const currentUser = await prisma.user.findUnique({
        where: { userID },
      });

      if (!currentUser) { 
        console.error("사용자 찾을 수 없음")
        return res.status(404).json({ 
          success: false,
          error: { code: 404, message: '현재 사용자를 찾을 수 없습니다.' }
        });
      }
      
      // 사용자의 moments 조회 
      const moments = await prisma.moment.findMany({
        where: { userID },
        orderBy: { date: 'desc' },
        select: {
          momentID: true,
          title: true, 
          description: true,
          status: true,
          date: true
        }
      });

      return res.status(200).json({
        success: true,
        messages: "성공적으로 조회 완료하였습니다.",
        user: currentUser.userID,
        moments: moments
      })
    } catch (err) {
      console.error('홈 조회 실패:', err.message);
      res.status(500).json({ 
        success: false,
        error: { code: 500, message: '홈 조회를 하는 데 실패하였습니다.' }
      });
    }
  };
  
// 당일 모먼트 완료 조회 
export const getCompletedMomentsByDay = async (req, res) => {
  try {
    const userID = req.user.userID; // 인증된 사용자 ID
    const { date } = req.body;

    // 현재 사용자 조회
    const currentUser = await prisma.user.findUnique({
      where: { userID },
    });

    if (!currentUser) { 
      return res.status(404).json({ 
        success: false,
        error: { code: 404, message: '현재 사용자를 찾을 수 없습니다.' }
      });
    }

    if (!date) {
      return res.status(400).json({
        success: false,
        error: { code: 400, message: "날짜(date)는 필수 입력값입니다." }
      });
    }

    // 입력된 날짜를 Date 형식으로 변환
    const inputDate = new Date(date);
    if (isNaN(inputDate)) {
      return res.status(400).json({
        success: false,
        error: { code: 400, message: "유효한 날짜 형식이 아닙니다." },
      });
    }

    // 특정 주에서 데이터 조회
    const completedMoments = await prisma.moment.findMany({
      where: {
        userID, // 현재 사용자만 조회
        date: {
          gte: new Date(inputDate.setHours(0, 0, 0, 0)), // 시작 시간: 자정
          lt: new Date(inputDate.setHours(24, 0, 0, 0)), // 종료 시간: 다음 날 자정
        },
      },
      select: {
        momentID: true,
        title: true,
        description: true,
        date: true,
        status: true,
      }
    });

    return res.status(200).json({
      success: true,
      messages: "해당 날짜의 완료된 데이터를 성공적으로 조회하였습니다.",
      completedMoments: completedMoments
    });

  } catch (err) {
    console.error("당일 완료 데이터 조회 실패:", err.message);
    return res.status(500).json({
      success: false,
      error: { code: 500, message: "서버 내부 오류가 발생했습니다." }
    });
  }
};

