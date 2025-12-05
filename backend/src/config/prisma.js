const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

// Create a singleton instance of PrismaClient
let prisma;

const getPrismaClient = () => {
  if (!prisma) {
    prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' 
        ? ['query', 'info', 'warn', 'error']
        : ['error'],
    });

    logger.info('✅ Prisma Client initialized');
  }
  
  return prisma;
};

// Connect to database
const connectDB = async () => {
  try {
    const client = getPrismaClient();
    await client.$connect();
    logger.info('✅ PostgreSQL Connected via Prisma');
  } catch (error) {
    logger.error('Error connecting to PostgreSQL:', error);
    process.exit(1);
  }
};

// Disconnect from database
const disconnectDB = async () => {
  try {
    if (prisma) {
      await prisma.$disconnect();
      logger.info('PostgreSQL disconnected');
    }
  } catch (error) {
    logger.error('Error disconnecting from PostgreSQL:', error);
  }
};

module.exports = {
  connectDB,
  disconnectDB,
  getPrismaClient,
  get prisma() {
    return getPrismaClient();
  }
};
