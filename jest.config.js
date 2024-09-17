module.exports = {
  testEnvironment: 'node',
  verbose: true,
  moduleNameMapper: {
    '^socket.io$': '<rootDir>/__mocks__/socket.io.js',
  },
};
