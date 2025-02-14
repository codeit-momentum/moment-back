import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const getUnreadNotificationsCount = async (req, res) => {
  try {
    const userID = req.user.userID;

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

    const unreadNotificationsCount = await prisma.notification.count({
      where: { userID, isRead: false}
    });

    return res.status(200).json({
      success: true,
      messages: "읽지 않은 알림 개수 불러오는데 성공하였습니다.",
      userID: currentUser.userID,
      count: unreadNotificationsCount
    })
  } catch (err) {
    console.error('읽지 않은 알림 개수 조회 실패:', err.message);
    res.status(500).json({ 
      success: false,
      error: { code: 500, message: '읽지 않은 알림 개수 조회에 실패하였습니다.' }
    });
  }
}

// 알림 조회 및 읽음 처리 
export const getAndMarkNotificationsAsRead = async (req, res) => {
  try {
    const userID = req.user.userID; // 현재 사용자 ID

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
    
    // 사용자의 알림 조회 (최대 8개)
    const notifications = await prisma.notification.findMany({
      where: { userID },
      orderBy: { createdAt: 'desc' },
      select: {
        notificationID: true,
        type: true,
        content: true,
        createdAt: true,
        isRead: true
      },
      take: 8
    });

    if (notifications.length > 0) {
        // 조회한 알림 중 아직 읽지 않은 항목만 읽음 처리
        const unreadNotificationIds = notifications
          .filter(notification => !notification.isRead)
          .map(notification => notification.notificationID);
  
        if (unreadNotificationIds.length > 0) {
          await prisma.notification.updateMany({
            where: {
              notificationID: { in: unreadNotificationIds }
            },
            data: { isRead: true }
          });
        }
    }

    return res.status(200).json({
      success: true,
      messages: "알림 목록을 조회하고 읽음 처리하였습니다.",
      userID: currentUser.userID,
      notifications: notifications.map(notification => ({
        ...notification,
        isRead: true        // 읽음 상태 반영 
      }))
    })
  } catch (err) {
    console.error('알림 조회 및 읽음 처리 실패:', err.message);
    res.status(500).json({ 
      success: false,
      error: { code: 500, message: '알림 조회 및 읽음 처리에 실패하였습니다.' }
    });
  }
};

// 알림 삭제 
export const deleteNotification = async (req, res) => {
  try {
    const userID = req.user.userID; // 인증된 사용자 ID
    const notificationID = req.params.notificationID;

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

    // 현재 알람 조회
    const currentNotification = await prisma.notification.findUnique({
      where: { notificationID, userID },
    });

    if (!currentNotification) { 
      console.error("현재 알람 찾을 수 없음")
      return res.status(404).json({ 
        success: false,
        error: { code: 404, message: '현재 알람을 찾을 수 없습니다.' }
      });
    }

    const deleteNotification = await prisma.notification.delete({
      where: { notificationID, userID }
    });

    return res.status(200).json({
      success: true,
      message: "해당 알람을 성공적으로 삭제하였습니다.",
      deleteNotification: deleteNotification
    });
  } catch (err) {
    console.error("해당 알람 삭제 실패:", err.message);
    return res.status(500).json({
      success: false,
      error: { code: 500, message: "서버 내부 오류가 발생했습니다." }
    });
  }
};