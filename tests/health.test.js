const request = require('supertest');
const app = require('../src/app');

describe('Health API', () => {
	it('returns health details', async () => {
		const response = await request(app).get('/health');

		expect(response.statusCode).toBe(200);
		expect(response.body).toMatchObject({
			success: true,
			message: 'Service healthy'
		});
		expect(response.body.data).toHaveProperty('status', 'ok');
		expect(response.body.data).toHaveProperty('database.requiredCollections');
	});

	it('returns 404 for unknown route', async () => {
		const response = await request(app).get('/unknown');

		expect(response.statusCode).toBe(404);
		expect(response.body.success).toBe(false);
	});

	it('validates required payload for HR registration', async () => {
		const response = await request(app)
			.post('/hr/registration')
			.type('form')
			.send({});

		expect(response.statusCode).toBe(400);
		expect(response.body.success).toBe(false);
	});

	it('rejects raw JSON payload for HR registration', async () => {
		const response = await request(app)
			.post('/hr/registration')
			.set('Content-Type', 'application/json')
			.send({
				name: 'Test HR',
				phone: '01000000000',
				email: 'test@example.com',
				password: 'StrongPass123',
				is_comfirmed: false
			});

		expect(response.statusCode).toBe(415);
		expect(response.body.success).toBe(false);
	});

	it('validates required payload for HR login', async () => {
		const response = await request(app)
			.post('/hr/login')
			.set('Content-Type', 'application/json')
			.send({});

		expect(response.statusCode).toBe(400);
		expect(response.body.success).toBe(false);
	});

	it('rejects non-json payload for HR login', async () => {
		const response = await request(app)
			.post('/hr/login')
			.type('form')
			.send({ email: 'hr@example.com', password: 'password123' });

		expect(response.statusCode).toBe(415);
		expect(response.body.success).toBe(false);
	});

	it('returns no active sessions when logout cookies are missing', async () => {
		const response = await request(app).post('/hr/logout');

		expect(response.statusCode).toBe(400);
		expect(response.body.success).toBe(false);
		expect(response.body.message).toBe('no active sessions');
	});
});
