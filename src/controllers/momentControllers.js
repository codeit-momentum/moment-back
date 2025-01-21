const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// 모멘트 생성 API
export const createMoment = async (req, res) => {
    const { title, description, status, date, complete, userID, bucketID } = req.body;

    try {
        const newMoment = await prisma.moment.create({
            data: {
            title,
            description,
            status,
            date: new Date(date),
            complete,
            userID,
            bucketID,
            }
        });
    
        res.status(201).json({ success: true, message: "Moment created successfully.", newMoment });
        } catch (error) {
        console.error('Error creating moment:', error);
        res.status(500).json({ success: false, message: "Failed to create moment.", error: error.message });
    }
};