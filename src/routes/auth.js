import express from 'express';
import axios from 'axios';

const router = express.Router();

router.post('/kakao', async (req, res) => {
    console.log('Request body:', req.body); // 요청 데이터 확인
    const { code } = req.body;

    try {
    const response = await axios.post('https://kauth.kakao.com/oauth/token', null, {
        params: {
        grant_type: 'authorization_code',
        client_id: process.env.REST_API_KEY,
        redirect_uri: process.env.REDIRECT_URI,
        code: code,
        },
    });

        res.json(response.data);
    } catch (error) {
        console.error(error.response.data);
        res.status(500).send('Token request failed');
    }
});

export default router;