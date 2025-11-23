const request = require('supertest');
const express = require('express');
const userRoutes = require('../routes/userRoutes');

const app = express();
app.use(express.json());
app.use('/api/user', userRoutes);

describe('User API', () => {
    it('GET /api/user/users deve retornar array', async () => {
        const res = await request(app).get('/api/user/users');
        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
    });
});
