const { Redis } = require('ioredis');
const logger = require('./logger');

let redisClient = null;

const connectRedis = () => {
  if (redisClient) return redisClient;

  redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: 3,
    retryStrategy: (times) => {
      if (times > 5) {
        logger.error('Redis: max retries reached');
        return null;
      }
      return Math.min(times * 200, 2000);
    },
    lazyConnect: true,
  });

  redisClient.on('connect', () => logger.info('Redis connected'));
  redisClient.on('error', (err) => logger.error('Redis error:', err.message));
  redisClient.on('close', () => logger.warn('Redis connection closed'));

  return redisClient;
};

const getRedis = () => {
  if (!redisClient) connectRedis();
  return redisClient;
};

module.exports = { connectRedis, getRedis };
