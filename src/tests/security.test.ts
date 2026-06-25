import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';

const app = createApp();

describe('API Security & Protection Tests', () => {

  describe('1. Authentication Protection', () => {
    it('should reject requests with missing Bearer token (401)', async () => {
      // By sending no token and avoiding DEV_AUTH headers, it should fail
      const response = await request(app)
        .get('/api/patients')
        .send();
        
      expect(response.status).toBe(401);
      expect(response.body.error).toBeDefined();
    });

    it('should reject requests with forged/invalid Bearer token (401)', async () => {
      const response = await request(app)
        .get('/api/patients')
        .set('Authorization', 'Bearer invalid.token.string')
        .send();
        
      expect(response.status).toBe(401);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('2. Input Validation (Zod)', () => {
    it('should reject malicious payloads with wrong data types (400)', async () => {
      // We send a POST to a route expecting specific payload
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 12345, // Invalid type
          password: ["malicious array"] // Invalid type
        });
        
      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('3. Rate Limiting Protection', () => {
    it('should block brute-force attempts after threshold (429)', async () => {
      // The auth limiter is set to 20 requests per 15 minutes.
      // We will fire 25 requests and expect a 429.
      let lastStatus = 200;
      
      for (let i = 0; i < 25; i++) {
        const response = await request(app)
          .post('/api/auth/login')
          .send({ email: 'test@example.com', password: 'wrong' });
        
        lastStatus = response.status;
      }
      
      expect(lastStatus).toBe(429); // Too Many Requests
    });
  });

});
