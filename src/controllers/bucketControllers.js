import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 버킷리스트 생성 
export const createBucket = async (req, res) => {
    try {
        const userID = req.user.userID; // 현재 사용자 ID
        const { type, content } = req.body; 

        // 현재 사용자 확인 
        const currentUser = await prisma.user.findUnique({
            where: { userID },
        });
        
        if (!currentUser) { 
            return res.status(404).json({ 
            success: false,
            error: { code: 404, message: '현재 사용자를 찾을 수 없습니다.' }
            });
        }
        
        // 요청 검사 
        if (!type || !content) {
            return res.status(400).json({
                success: false,
                error: { code: 400, message: "type과 content는 필수입니다." }
            });
        }

        // 버킷리스트 생성
        const newBucket = await prisma.bucket.create({
            data: {
                userID: currentUser.userID,
                type: type,
                content: content
            }
        });

        return res.status(201).json({
            success: true,
            message: "버킷리스트가 성공적으로 생성되었습니다.",
            bucket: newBucket
        });
    
    } catch (err) {
        console.error('버킷리스트 생성 실패:', err.message);
        res.status(500).json({ 
        success: false,
        error: { code: 500, message: '버킷리스트 생성에 실패하였습니다.' }
    });
    }
};

// 버킷리스트 내용 수정 
export const updateBucket = async (req, res) => {
    try {
        const userID = req.user.userID; // 현재 사용자 ID
        const { bucketID } = req.params;
        const { type, content } = req.body; 

        // 현재 사용자 확인 
        const currentUser = await prisma.user.findUnique({
            where: { userID: userID },
        });
        
        if (!currentUser) { 
            return res.status(404).json({ 
            success: false,
            error: { code: 404, message: '현재 사용자를 찾을 수 없습니다.' }
            });
        }
        
        // 요청 검사 
        if (!bucketID || !type || !content) {
            return res.status(400).json({
                success: false,
                error: { code: 400, message: "bucketID, type, content는 필수입니다." }
            });
        }

        // 버킷리스트가 존재하는지 확인 
        if (!bucketID) {
            return res.status(404).json({
                success: false,
                error: { code: 404, message: "해당 버킷리스트를 찾을 수 없습니다." }
            });
        }

        // 버킷리스트 내용 업데이트 
        const updatedBucket = await prisma.bucket.update({
            where: { userID: userID, bucketID: bucketID, type: type },
            data: { content, updatedAt: new Date() }
        });

        return res.status(200).json({
            success: true,
            message: "버킷리스트가 성공적으로 수정되었습니다.",
            bucket: updatedBucket
        });
    
    } catch (err) {
            console.error("버킷리스트 수정 처리 실패:", err.message);
            return res.status(500).json({
            success: false,
            error: { code: 500, message: "서버 내부 오류가 발생했습니다." }
        });
    }
};

// 버킷리스트 삭제 
export const deleteBucket = async (req, res) => {
    try {
        const userID = req.user.userID; // 현재 사용자 ID
        const { bucketID } = req.params;
        const { type } = req.body; 

        // 현재 사용자 확인 
        const currentUser = await prisma.user.findUnique({
            where: { userID: userID },
        });
        
        if (!currentUser) { 
            return res.status(404).json({ 
            success: false,
            error: { code: 404, message: '현재 사용자를 찾을 수 없습니다.' }
            });
        }
        
        // 요청 검사 
        if (!bucketID || !type) {
            return res.status(400).json({
                success: false,
                error: { code: 400, message: "bucketID, bucketType는 필수입니다." }
            });
        }

        // 버킷리스트가 존재하는지 확인 
        if (!bucketID) {
            return res.status(404).json({
                success: false,
                error: { code: 404, message: "해당 버킷리스트를 찾을 수 없습니다." }
            });
        }

        // 버킷리스트 삭제 
        const deletedBucket = await prisma.bucket.delete({
            where: { bucketID }
        });

        return res.status(200).json({
            success: true,
            message: "버킷리스트가 성공적으로 삭제되었습니다.",
            bucket: deletedBucket.bucketID
        });
    
    } catch (err) {
            console.error("버킷리스트 삭제 처리 실패:", err.message);
            return res.status(500).json({
            success: false,
            error: { code: 500, message: "서버 내부 오류가 발생했습니다." }
        });
    }
};
