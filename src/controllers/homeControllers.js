import { PrismaClient } from '@prisma/client';
import moment from 'moment-timezone';

const prisma = new PrismaClient();
const koreaNow = moment().tz("Asia/Seoul").toDate();

// 홈 당일 모멘트 조회
export const getHome = async (req, res) => {
  try {
    // 현재 인증된 사용자 정보 가져오기
    const userID = req.user.userID; // 현재 사용자 ID
    const dateString = req.params.date;

    // 현재 사용자 조회
    const currentUser = await prisma.user.findUnique({
      where: { userID },
    });

    if (!currentUser) { 
      return res.status(404).json({ 
        success: false,
        error: { code: 404, message: '현재 사용자를 찾을 수 없습니다.' }
      });
    };
    
    const date = moment.tz(dateString, "Asia/Seoul").toDate();
    if (!date || isNaN(date.getTime())) {
      return res.status(400).json({
        success: false,
        error: { code: 400, message: "유효하지 않은 날짜 형식입니다. YYYY-MM-DD 형식으로 입력해주세요." },
      });
    }

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
    const completedCount = moments.filter(m => m.isCompleted).length;

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
    const dateString = req.params.date;  

    // 날짜 검증
    const date = moment.tz(dateString, "Asia/Seoul").toDate();
    if (!date || isNaN(date.getTime())) {
      return res.status(400).json({
        success: false,
        error: { code: 400, message: "유효하지 않은 날짜 형식입니다. YYYY-MM-DD 형식으로 입력해주세요." }
      });
    }

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

    // 해당 날짜가 포함된 주의 월요일 찾기
    const dayOfWeek = date.getDay(); // 요일을 0 (일요일)부터 6 (토요일)까지 반환
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // 월요일까지의 차이 계산
    const startOfWeek = date;
    startOfWeek.setDate(date.getDate() + diffToMonday); // 월요일로 설정
    
    // 일요일 계산
    const endOfWeek = moment.tz(startOfWeek, "Asia/Seoul").toDate();
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    
    // 월요일부터 일요일까지 날짜 배열 생성
    const weekDates = [];
    for (let i = 0; i < 7; i++) {
        const weekDay = moment.tz(startOfWeek, "Asia/Seoul").toDate();
        weekDay.setDate(startOfWeek.getDate() + i);
        weekDates.push(weekDay); // "YYYY-MM-DD" 형식으로 변환하여 배열에 추가
    }

    console.log("일주일 날짜 배열: ", weekDates);

    // 해당 주의 모든 moment 가져오기 (startDate와 endDate 범위로 필터링)
    const moments = await prisma.moment.findMany({
      where: {
        userID: userID, // 현재 사용자만 조회
        OR: weekDates.map(day => ({
          startDate: { lte: day },
          endDate: { gte: day }
        }))
      },
      select: {
        startDate: true,
        endDate: true,
        isCompleted: true,
        completedAt: true
      }
    });

    // 날짜별 isComplete 상태 확인
    const results = weekDates.map(day => {
      const momentsForDate = moments.filter(moment =>
        moment.startDate <= day && moment.endDate >= day
      );
    
      // isCompleted 변경이 해당 날짜에서 발생한 경우만 체크
      const isComplete = 
        momentsForDate.length > 0 && 
        momentsForDate.some(m => 
          m.isCompleted && 
          m.completedAt && 
          moment.tz(m.completedAt, "Asia/Seoul").toDate().toISOString().split("T")[0] === day.toISOString().split("T")[0]
      );
    
      return {
        date: moment(day).format("YYYY-MM-DD"), // 날짜 형식 변환
        isComplete: isComplete
      };
    });
    

    return res.status(200).json({
      success: true,
      message: "해당 주의 완료된 데이터를 성공적으로 조회하였습니다.",
      startDate: startOfWeek.toISOString().split("T")[0],
      endDate: endOfWeek.toISOString().split("T")[0],
      weekStatus: results
    });

  } catch (err) {
    console.error("주간 완료 데이터 조회 실패:", err.message);
    return res.status(500).json({
      success: false,
      error: { code: 500, message: err.message }
    });
  }
};

// 연속적으로 인증한 날짜 조회 (작심 N일)
export const getConsecutiveCompletedDays = async (req, res) => {
  try {
    const userID = req.user.userID; // 인증된 사용자 ID
    const dateString = req.params.date;     

    // 현재 사용자 조회
    const currentUser = await prisma.user.findUnique({
      where: { userID }
    });

    if (!currentUser) {
      return res.status(404).json({
        success: false,
        error: { code: 404, message: '현재 사용자를 찾을 수 없습니다.' }
      });
    }
    
    const targetDate = moment.tz(dateString, "Asia/Seoul").toDate();
    if (isNaN(targetDate.getTime())) {
      return res.status(400).json({
        success: false,
        error: { code: 400, message: "유효하지 않은 날짜 형식입니다." },
      });
    }

    // 연속된 isCompleted === true인 날짜 개수를 계산
    let consecutiveDays = 1;
    let checkDate = moment.tz(targetDate, "Asia/Seoul").toDate();
    checkDate.setDate(checkDate.getDate() - 1); // 하루 전부터 검사 시작

    while (true) {
      const moments = await prisma.moment.findMany({
        where: {
          userID: userID,
          startDate: { lte: checkDate },
          endDate: { gte: checkDate }
        },
        select: {
          isCompleted: true,
        }
      });

      const isComplete = moments.length > 0 && moments.some(m => m.isCompleted);

      if (isComplete) {
        consecutiveDays++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    return res.status(200).json({
      success: true,
      message: "연속 완료된 날짜 개수를 성공적으로 조회하였습니다.",
      consecutiveDays: consecutiveDays
    });
  } catch (err) {
    console.error("연속 완료 날짜 조회 실패:", err.message);
    return res.status(500).json({
      success: false,
      error: { code: 500, message: "서버 내부 오류가 발생했습니다." }
    });
  }
};

// 버킷 달성 확인 
export const getCompletedBucket = async (req, res) => {
  try {
    const userID = req.user.userID; // JWT 인증 후 주입된 userID

    // 전체 버킷 수
    const totalBuckets = await prisma.bucket.count({
        where: { userID },
    });
    
    // 완료된 버킷 수
    const completedBucketsCount = await prisma.bucket.count({
        where: { userID, isCompleted: true },
    });

    const completionRate = totalBuckets === 0
      ? 0
      : (completedBucketsCount / totalBuckets) * 100;


    return res.status(200).json({
      success: true,
      completedBucketsCount: completedBucketsCount,
      completionRate: completionRate.toFixed(2),
    });
  } catch (error) {
    console.error('버킷 달성 현황 조회 실패:', error);
    return res.status(500).json({
      success: false,
      error: { code: 500, message: '서버 내부 오류가 발생했습니다.' },
    });
  }
};