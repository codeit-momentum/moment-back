import { PrismaClient } from '@prisma/client';
import { parseISO, startOfWeek, endOfWeek, eachDayOfInterval } from "date-fns";

const prisma = new PrismaClient();

// 홈 당일 모멘트 조회
export const getHome = async (req, res) => {
    try {
      // 현재 인증된 사용자 정보 가져오기
      const userID = req.user.userID; // 현재 사용자 ID
      const date = req.body.date;

      // 현재 사용자 조회
      const currentUser = await prisma.user.findUnique({
        where: { userID: req.user.userID },
      });

      if (!currentUser) { 
        return res.status(404).json({ 
          success: false,
          error: { code: 404, message: '현재 사용자를 찾을 수 없습니다.' }
        });
      };
      
      // 사용자의 moments 조회 
      const moments = await prisma.moment.findMany({
        where: {
          userID,
          startDate: { lte: date }, 
          endDate: { gte: date }      
        },
        select: {
          momentID: true,
          content: true, 
          isCompleted: true
        }
      });

      // 당일 모먼트 완료 개수 
      const completedCount = await prisma.moment.count({
        where: {
          userID,
          startDate: { lte: date }, 
          endDate: { gte: date },
          isCompleted: true
        }
      });

      return res.status(200).json({
        success: true,
        messages: "성공적으로 조회 완료하였습니다.",
        user: currentUser.userID,
        moments: moments,
        completedCount: completedCount

      })
    } catch (err) {
      console.error('홈 조회 실패:', err.message);
      res.status(500).json({ 
        success: false,
        error: { code: 500, message: '홈 조회를 하는 데 실패하였습니다.' }
      });
    }
  };
  
// 일주일 완료 상태 조회 
export const getCompletedMomentsByWeek = async (req, res) => {
  try {
    const userID = req.user.userID; // 인증된 사용자 ID
    const { date } = req.body;

    // 현재 사용자 조회
    const currentUser = await prisma.user.findUnique({
      where: { userID: req.user.userID },
    });

    if (!currentUser) { 
      return res.status(404).json({ 
        success: false,
        error: { code: 404, message: '현재 사용자를 찾을 수 없습니다.' }
      });
    };

    if (!date) {
      return res.status(400).json({
        success: false,
        error: { code: 400, message: "날짜(date)는 필수 입력값입니다." }
      });
    }

    // 해당 날짜가 포함된 주의 시작(월요일)과 끝(일요일) 계산
    const startDate = startOfWeek(parseISO(date), { weekStartsOn: 2 }); // 월요일 기준 시작
    const endDate = endOfWeek(parseISO(date), { weekStartsOn: 2 }); // 일요일 기준 끝

    // 월요일부터 일요일까지의 모든 날짜 배열 생성
    const weekDates = eachDayOfInterval({ start: startDate, end: endDate });

    // 해당 주의 모든 moment 가져오기 (startDate와 endDate 범위로 필터링)
    const moments = await prisma.moment.findMany({
      where: {
        userID: userID,
        OR: weekDates.map(day => ({
          startDate: { lte: day },
          endDate: { gte: day }
        }))
      },
      select: {
        startDate: true,
        endDate: true,
        isCompleted: true,
      }
    });

    // 날짜별 isComplete 상태 확인
    const results = weekDates.map(day => {
      const momentsForDate = moments.filter(moment =>
        moment.startDate <= day && moment.endDate >= day
      );

      // 모든 moment가 완료 상태인지 확인 (하나라도 false면 false 처리)
      const isComplete =
        momentsForDate.length > 0 && momentsForDate.every(m => m.isCompleted);

      return {
        date: day.toISOString().split("T")[0], // 날짜를 YYYY-MM-DD 형식으로 반환
        isComplete: isComplete
      };
    });

    return res.status(200).json({
      success: true,
      message: "해당 주의 완료된 데이터를 성공적으로 조회하였습니다.",
      startDate: startDate.toISOString().split("T")[0],
      endDate: endDate.toISOString().split("T")[0],
      weekStatus: results
    });

  } catch (err) {
    console.error("주간 완료 데이터 조회 실패:", err.message);
    return res.status(500).json({
      success: false,
      error: { code: 500, message: "서버 내부 오류가 발생했습니다." }
    });
  }
};