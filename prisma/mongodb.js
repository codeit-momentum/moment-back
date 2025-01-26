import dotenv from 'dotenv';
dotenv.config();  // .env 파일을 로드

import { MongoClient } from 'mongodb';

// MongoDB 연결 URL
const url = process.env.DATABASE_URL;  // dotenv로 환경 변수에서 불러옴

async function deleteUsers(userIDs) {
    const client = new MongoClient(url);
    const dbName = 'momentum';  // 사용할 DB 이름

    try {
        await client.connect();
        console.log('Connected to MongoDB');

        const db = client.db(dbName);
        const collection = db.collection('User'); // 컬렉션 이름

        // deleteMany로 여러 개의 userID 삭제
        const result = await collection.deleteMany({ 
            userID: { $in: userIDs }  // userID가 배열에 포함된 문서 삭제
        });

        console.log(`Deleted ${result.deletedCount} document(s)`); // 삭제된 문서 수 출력
    } catch (error) {
        console.error('Error deleting users:', error);
    } finally {
        await client.close(); // 연결 종료
    }
}

// 사용자 ID 배열로 삭제 호출
deleteUsers([ 'user001', 'user002', 'user003', 'user004', 'user005', 'user006', 'user007', 'user008', 'user009', 'user010', '3889979645' ]);