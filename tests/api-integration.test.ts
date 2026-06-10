import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';

const app = createApp();

describe('API Integration Tests', () => {
  it('GET /health should return 200 and status ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('ok');
  });

  it('GET /api/patients should require authentication', async () => {
    const res = await request(app).get('/api/patients');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('POST /api/auth/register/staff should validate input', async () => {
    const res = await request(app).post('/api/auth/register/staff').send({
      email: 'invalid-email',
      password: '123',
    });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('GET /api/patient/me should require patient role authentication', async () => {
    const res = await request(app).get('/api/patient/me');
    expect(res.status).toBe(401);
  });

  it('GET /api/alerts should fail without nurse role', async () => {
    const res = await request(app).get('/api/alerts');
    expect(res.status).toBe(401);
  });
});
