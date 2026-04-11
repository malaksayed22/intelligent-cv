const request = require('supertest');
const app = require('../src/app');

describe('Health API', () => {
	it('returns health details', async () => {
		const response = await request(app).get('/api/health');

		expect(response.statusCode).toBe(200);
		expect(response.body).toMatchObject({
			success: true,
			message: 'Service healthy'
		});
		expect(response.body.data).toHaveProperty('status', 'ok');
		expect(response.body.data).toHaveProperty('database.requiredCollections');
	});

	it('returns 404 for unknown route', async () => {
		const response = await request(app).get('/api/unknown');

		expect(response.statusCode).toBe(404);
		expect(response.body.success).toBe(false);
	});
});
