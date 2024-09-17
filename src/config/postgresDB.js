require('dotenv').config();
const { Sequelize } = require('sequelize');

// Create a new Sequelize instance
const sequelize = new Sequelize(
  process.env.POSTGRES_DB,        // Database name
  process.env.POSTGRES_USER,      // Username
  process.env.POSTGRES_PASSWORD,  // Password
  {
    host: process.env.POSTGRES_HOST,
    port: process.env.POSTGRES_PORT,
    dialect: 'postgres',
    logging: false,  // Disable logging for cleaner console output
  }
);

// Test the connection
const connectToPostgresDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('Connected to PostgreSQL successfully');
  } catch (error){
    console.error('Unable to connect to PostgreSQL:', error);
    process.exit(1);
  }
};

module.exports = { sequelize, connectToPostgresDB };
