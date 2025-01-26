import { PutObjectCommand } from '@aws-sdk/client-s3';
import { PrismaClient } from '@prisma/client';
import { s3Client } from '../config/s3config.js';

const prisma = new PrismaClient();

// 모멘트 생성 API (예외처리 완료)
export const createMoments = async (req, res) => {
    try {
        const userID = req.user.userID;
        const { bucketID } = req.params;
        const { startDate, endDate, moments } = req.body;

        // 1) 요청 검증
        if (!Array.isArray(moments) || moments.length === 0) {
            return res.status(400).json({
                success: false,
                error: { code: 400, message: 'moments 배열이 비어 있습니다.' },
            });
        }
        
        // 2) 버킷 조회
        const bucket = await prisma.bucket.findUnique({ where: { bucketID } });
        if (!bucket) {
            return res.status(404).json({
                success: false,
                error: { code: 404, message: '해당 버킷을 찾을 수 없습니다.' },
            });
        }
        // 소유자 체크
        if (bucket.userID !== userID) {
            return res.status(403).json({
                success: false,
                error: { code: 403, message: '버킷 소유자가 아닙니다.' },
            });
        }
    
        //버킷 상태 체크: 반복형 + 도전 중
        if (bucket.type !== 'REPEAT' || !bucket.isChallenging) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 400,
                    message: '모멘트를 추가할 수 없는 버킷입니다. (반복형 + 도전 중이어야 함)',
                },
            });
        }
        
        // 3) 트랜잭션
        const result = await prisma.$transaction(async (tx) => {
        
            //  여러 모멘트 생성
            const createdMoments = await Promise.all(
                moments.map((m) =>
                    tx.moment.create({
                        data: {
                            content: m.content || '',
                            photoUrl: null,
                            isCompleted: false,
                            startDate: new Date(m.startDate),
                            endDate: new Date(m.endDate),
                            bucketID: bucketID,
                            userID: userID,
                        },
                    })
                )
            );
            //  버킷의 startDate, endDate 업데이트
            //      (이미 값이 있다면 덮어쓰기, 없으면 새로 세팅)
            const updatedBucket = await tx.bucket.update({
                where: { bucketID },
                data: {
                    startDate: startDate ? new Date(startDate) : bucket.startDate,
                    endDate: endDate ? new Date(endDate) : bucket.endDate,
                    updatedAt: new Date(),
                },
            });
            
            return { updatedBucket, createdMoments };
        });
        
        return res.status(201).json({
            success: true,
            message: '버킷 기간이 설정되고, 모멘트들이 생성되었습니다.',
            bucket: result.updatedBucket,
            moments: result.createdMoments,
        });
    } catch (error) {
        console.error('버킷 날짜 & 모멘트 벌크 생성 실패:', error);
        return res.status(500).json({
            success: false,
            error: { code: 500, message: '서버 내부 오류가 발생했습니다.' },
        });
    }
};

// 모멘트 조회
export const getMomentsByBucket = async (req, res) => {
    try {
        const userID = req.user.userID;
        const { bucketID } = req.params;
    
        //버킷 조회
        const bucket = await prisma.bucket.findUnique({
            where: { bucketID },
        });

        if (!bucket) {
            return res.status(404).json({
            success: false,
            error: { code: 404, message: '해당 버킷을 찾을 수 없습니다.' },
            });
        }

        // 소유자 체크
        if (bucket.userID !== userID) {
            return res.status(403).json({
                success: false,
                error: { code: 403, message: '버킷 소유자가 아닙니다.' },
            });
        }

        //모멘트 목록 조회
        const moments = await prisma.moment.findMany({
            where: { bucketID },
            orderBy: { createdAt: 'asc' }, // 정렬 기준
        });
        const totalMomentCount = moments.length;
    
        return res.status(200).json({
            success: true,
            moments,
            momentsCount: totalMomentCount,
        });
        } catch (error) {
        console.error('모멘트 목록 조회 실패:', error);
        return res.status(500).json({
            success: false,
            error: { code: 500, message: '서버 내부 오류가 발생했습니다.' },
        });
    }
};


// 모멘트 달성 (예외처리 완료)
export const updateMoment = async (req, res) => {
    try {
        const userID = req.user.userID;
        const { momentID } = req.params;

        // 모멘트+버킷 조회
        const existingMoment = await prisma.moment.findUnique({
            where: { momentID },
            include: { bucket: true },
        });
        if (!existingMoment) {
            return res.status(404).json({
                success: false,
                error: { code: 404, message: '모멘트를 찾을 수 없습니다.' },
            });
        }
        if (existingMoment.bucket.userID !== userID) {
            return res.status(403).json({
                success: false,
                error: { code: 403, message: '모멘트 수정 권한이 없습니다.' },
            });
        }
    
        // 버킷이 도전 중인지 확인
        if (!existingMoment.bucket.isChallenging) {
            return res.status(400).json({
                success: false,
                error: { code: 400, message: '이미 도전이 끝난 버킷입니다. 수정할 수 없습니다.' },
            });
        }
    
        // S3 이미지 업로드 처리
        let photoUrl = null;
        if (req.file) {
            const bucketName = process.env.AWS_S3_BUCKET_NAME;
            const key = `moment/${userID}/${momentID}/${Date.now()}`;
    
            const command = new PutObjectCommand({
                Bucket: bucketName,
                Key: key,
                Body: req.file.buffer,
                ContentType: req.file.mimetype,
            });
    
            await s3Client.send(command);
            photoUrl = `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
        }
    
        // 기존 완료 상태 / 새로운 완료 상태 계산
        const oldIsCompleted = existingMoment.isCompleted;
        const newIsCompleted = photoUrl ? true : oldIsCompleted;
    
        // 트랜잭션
        const result = await prisma.$transaction(async (tx) => {
            // 1) 모멘트 업데이트
            const updatedMoment = await tx.moment.update({
                where: { momentID },
                data: {
                    photoUrl: photoUrl,
                    isCompleted: true,
                    updatedAt: new Date(),
                },
            });
    
            
            // 2) 버킷 아래 모든 모멘트 완료 여부 확인
            const bucketID = existingMoment.bucket.bucketID;

            // 전체 모멘트 개수
            const totalMoments = await tx.moment.count({
                where: { bucketID },
            });

            // 완료된 모멘트 개수
            const completedMoments = await tx.moment.count({
                where: { bucketID, isCompleted: true },
            });

            let updatedBucket = null;
            // 모든 모멘트가 완료되었으면 버킷도 완료 상태로 업데이트
            if (totalMoments > 0 && totalMoments === completedMoments) {
                updatedBucket = await tx.bucket.update({
                    where: { bucketID },
                    data: { isCompleted: true, updatedAt: new Date() },
                });
            }

            return { updatedMoment, updatedBucket, totalMoments, completedMoments };
        });
    
        return res.status(200).json({
            success: true,
            message: '모멘트를 업데이트했습니다.',
            result,
        });
    } catch (error) {
        console.error('모멘트 수정 실패:', error);
        return res.status(500).json({
            success: false,
            error: { code: 500, message: '서버 내부 오류가 발생했습니다.' },
        });
    }
};
