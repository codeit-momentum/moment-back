import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 사용자 친구 목록 조회
export const getFriends = async (req, res) => {
  const userID = req.user.userID;

  try {
    // 친구 목록 조회
    const friends = await prisma.friend.findMany({
      where: {
          userID: userID, // 사용자가 친구 관계의 주체인 경우
      },
      include: {
        friendUser: {
          select: {
            userID: true,
            nickname: true,
            profileImageUrl: true,
          },
        },
      },
    });

    // 친구 목록 응답 데이터 변환
    const friendList = friends.map((friend) => ({
      userID: friend.friendUser.userID,
      nickname: friend.friendUser.nickname,
      profileImageUrl: friend.friendUser.profileImageUrl,
      isFixed: friend.isFixed,
      fixedAt: friend.fixedAt,
      createdAt: friend.createdAt,
    }));

    res.status(200).json({
      message: '친구 목록 조회 성공',
      friends: friendList,
    });
  } catch (err) {
    console.error('친구 목록 조회 오류:', err.message);
    res.status(500).json({ message: '친구 목록 조회 중 오류가 발생했습니다.' });
  }
};

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

// 사용자 친구 요청 목록 조회 (보낸 요청, 받은 요청)
export const getFriendRequests = async (req, res) => {
  const userID = req.user.userID;

  try {
    // 사용자가 받은 친구 요청
    const receivedRequests = await prisma.friendRequest.findMany({
      where: { 
        receiverID: userID,
        status: 'PENDING',
      },
      include: {
        requester: {
          select: {
            userID: true,
            nickname: true,
            profileImageUrl: true,
          },
        },
      },
    });

    // 사용자가 보낸 친구 요청 (PENDING 상태만)
    const sentRequests = await prisma.friendRequest.findMany({
      where: { 
        requesterID: userID,
        status: 'PENDING',
      },
      include: {
        receiver: {
          select: {
            userID: true,
            nickname: true,
            profileImageUrl: true,
          },
        },
      },
    });

    // 응답 데이터 형식 변환
    const received = receivedRequests.map((request) => ({
      id: request.id,
      requesterID: request.requester.userID,
      requesterNickname: request.requester.nickname,
      requesterProfileImageUrl: request.requester.profileImageUrl,
      status: request.status,
      createdAt: request.createdAt,
    }));

    const sent = sentRequests.map((request) => ({
      id: request.id,
      receiverID: request.receiver.userID,
      receiverNickname: request.receiver.nickname,
      receiverProfileImageUrl: request.receiver.profileImageUrl,
      status: request.status,
      createdAt: request.createdAt,
    }));

    res.status(200).json({
      message: '친구 요청 목록 조회 성공',
      receivedRequests: received,
      sentRequests: sent,
    });
  } catch (err) {
    console.error('친구 요청 목록 조회 오류:', err.message);
    res.status(500).json({ message: '친구 요청 목록 조회 중 오류가 발생했습니다.' });
  }
};

// 친구 요청 수락/거절
export const handleFriendRequest = async (req, res) => {
  const { friendRequestID } = req.params; // 친구 요청 ID
  const { status } = req.body; // 변경할 요청 상태 (ACCEPTED/REJECTED)
  const userID = req.user.userID; // 현재 사용자 ID

  if (!['ACCEPTED', 'REJECTED'].includes(status)) {
    return res.status(400).json({ message: '잘못된 status값이 들어왔습니다.' });
  }

  try {
    // 친구 요청 조회
    const friendRequest = await prisma.friendRequest.findUnique({
      where: { id: friendRequestID },
      include: {
        requester: {
          select: {
            userID: true,
            nickname: true,
            profileImageUrl: true,
          },
        },
        receiver: {
          select: {
            userID: true,
            nickname: true,
            profileImageUrl: true,
          },
        },
      },
    });

    if (!friendRequest) {
      return res.status(404).json({ message: '해당 친구 요청을 찾을 수 없습니다.' });
    }

    if (friendRequest.receiverID !== userID) {
      return res.status(403).json({ message: '이 친구 요청을 처리할 권한이 없습니다.' });
    }

    if (status === 'ACCEPTED') {
      // 친구 요청 수락 처리
      await prisma.friendRequest.update({
        where: { id: friendRequestID },
        data: { status: 'ACCEPTED' },
      });

      // 친구 관계 추가
      await prisma.friend.createMany({
        data: [
          {
            userID: friendRequest.requester.userID,
            friendUserID: friendRequest.receiver.userID,
          },
          {
            userID: friendRequest.receiver.userID,
            friendUserID: friendRequest.requester.userID,
          },
        ],
      });

      return res.status(200).json({
        message: '친구 요청을 성공적으로 받았습니다.',
        friendRequest: {
          friendRequestID: friendRequest.id,
          userID: friendRequest.requester.userID,
          friendID: friendRequest.receiver.userID,
          status: 'ACCEPTED',
          createdAt: friendRequest.createdAt,
        },
      });
    } else if (status === 'REJECTED') {
      // 친구 요청 거절 처리
      await prisma.friendRequest.update({
        where: { id: friendRequestID },
        data: { status: 'REJECTED' },
      });

      return res.status(200).json({
        message: '친구 요청을 성공적으로 거절했습니다.',
        friendRequest: {
          friendRequestID: friendRequest.id,
          userID: friendRequest.requester.userID,
          friendID: friendRequest.receiver.userID,
          status: 'REJECTED',
          createdAt: friendRequest.createdAt,
        },
      });
    }
  } catch (err) {
    console.error('친구 요청 처리 오류:', err.message);
    res.status(500).json({ message: '친구 요청 처리 중 오류가 발생했습니다.' });
  }
};

// 친구 삭제
export const deleteFriend = async (req, res) => {
  const userID = req.user.userID; // 현재 사용자 ID
  const { friendUserID } = req.body; // 삭제할 친구의 사용자 ID

  try {
    const friendRelation = await prisma.friend.findMany({
      where: {
        OR: [
          { userID, friendUserID },
          { userID: friendUserID, friendUserID: userID },
        ],
      },
    });

    if (friendRelation.length === 0) {
      return res.status(404).json({ message: '친구 관계가 존재하지 않습니다.' });
    }

    await prisma.friend.deleteMany({
      where: {
        OR: [
          { userID, friendUserID },
          { userID: friendUserID, friendUserID: userID },
        ],
      },
    });

    res.status(200).json({ message: '친구 관계를 성공적으로 삭제하였습니다.' });
  } catch (err) {
    console.error('친구 삭제 오류:', err.message);
    res.status(500).json({ message: '친구 삭제 중 오류가 발생했습니다.' });
  }
};