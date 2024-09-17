const Server = jest.fn(() => ({
  on: jest.fn(),
  of: jest.fn().mockReturnThis(),
  to: jest.fn().mockReturnThis(),
  emit: jest.fn(), // You might need this if you want to check if emit was called
}));

module.exports = { Server };
