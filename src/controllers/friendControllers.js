import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 사용자 친구 목록 조회
export const getFriends = async (req, res) => {
  try {
    // 친구 목록 조회
    const friends = await prisma.friend.findMany({
      where: {
        OR: [
          { userID: req.user.userID }, // 사용자가 친구 관계의 주체인 경우
          { friendUserID: req.user.userID }, // 사용자가 친구 관계의 대상인 경우
        ],
      },
      include: {
        user: true, // 친구 관계의 주체 정보 포함
        friendUser: true, // 친구 관계의 대상 정보 포함
      },
    });

    // 친구 목록 응답
    const friendList = friends.map((friend) => {
      const isCurrentUserPrimary = friend.userID === userId;
      const friendInfo = isCurrentUserPrimary ? friend.friendUser : friend.user;

      return {
        userID: friendInfo.userID,
        nickname: friendInfo.nickname,
        profileImageUrl: friendInfo.profileImageUrl,
        isFixed: friend.isFixed,
        fixedAt: friend.fixedAt,
        createdAt: friend.createdAt,
      };
    });

    res.status(200).json({
      message: '친구 목록 조회 성공',
      friends: friendList,
    });
  } catch (err) {
    console.error('친구 목록 조회 오류:', err.message);
    res.status(500).json({ message: '친구 목록 조회 중 오류가 발생했습니다.' });
  }
}

// 사용자 친구 요청 전송
export const addFriendRequest = async (req, res) => {
  const { friendCode } = req.body;
  const requesterID = req.user.userID; // 현재 요청을 보낸 사용자 ID

  // 친구코드가 없는 경우 에러 반환
  if (!friendCode) {
    return res.status(400).json({ message: '친구코드가 필요합니다.' });
  }

  try {
    // 친구코드로 상대방 ID 조회
    const receiver = await prisma.user.findUnique({
      where: { friendCode },
    });

    // 친구코드가 유효하지 않은 경우
    if (!receiver) {
      return res.status(404).json({ message: '존재하지 않는 친구코드 입니다.' });
    }

    const receiverID = receiver.userID;

    // 자기 자신에게 친구 요청을 보낼 수 없음
    if (requesterID === receiverID) {
      return res.status(400).json({ message: '자기 자신에게 친구 요청을 보낼 수 없습니다.' });
    }

    // 요청자의 정보 조회
    const requester = await prisma.user.findUnique({
      where: { userID: requesterID },
    });

    // 기존 친구 요청 또는 친구 관계 상태 확인
    const existingRequest = await prisma.friendRequest.findUnique({
      where: {
        requesterID_receiverID: {
          requesterID,
          receiverID,
        },
      },
    });

    if (existingRequest) {
      if (existingRequest.status === 'PENDING') {
        return res.status(409).json({
          message: '이미 상대방으로부터 친구 요청이 있습니다. 친구 요청 목록을 확인해주세요.',
        });
      }
      if (existingRequest.status === 'ACCEPTED') {
        return res.status(409).json({ message: '이미 상대방과 친구 관계입니다.' });
      }
      if (existingRequest.status === 'REJECTED') {
        return res.status(409).json({
          message: '상대방으로부터 친구 요청 거절 당했습니다.',
        });
      }
    }

    // 친구 요청 생성
    const newFriendRequest = await prisma.friendRequest.create({
      data: {
        requesterID,
        receiverID,
        status: 'PENDING', // 기본 상태 (승낙 대기)
      },
    });

    res.status(201).json({
      message: '친구 요청 전송 성공',
      friendRequest: {
        id: newFriendRequest.id,
        requesterID: newFriendRequest.requesterID,
        requesterNickname: requester.nickname, // 요청자 닉네임 (DB 저장 X)
        receiverID: newFriendRequest.receiverID,
        receiverNickname: receiver.nickname, // 수신자 닉네임 (DB 저장 X)
        status: newFriendRequest.status,
        createdAt: newFriendRequest.createdAt,
      },
    });
  } catch (err) {
    console.error('친구 요청 전송 오류:', err.message);
    res.status(500).json({ message: '친구 요청 전송 중 오류가 발생했습니다.' });
  }
};