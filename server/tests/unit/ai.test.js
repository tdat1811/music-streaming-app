// server/tests/unit/ai.test.js
const aiController = require('../../src/controllers/aiController');

describe('AI Controller Unit Tests', () => {
  it('should return mood presets successfully', () => {
    const req = {};
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    aiController.getMoodPresets(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalled();
    const result = res.json.mock.calls[0][0];
    expect(result.success).toBe(true);
    expect(Array.isArray(result.data)).toBe(true);
    expect(result.data.length).toBeGreaterThan(0);
    expect(result.data.some((m) => m.id === 'happy')).toBe(true);
    expect(result.data.some((m) => m.id === 'sad')).toBe(true);
  });

  it('should reject empty message', async () => {
    const req = { body: { message: '' } };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    await aiController.chatWithAI(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    const result = res.json.mock.calls[0][0];
    expect(result.success).toBe(false);
  });
});
