const { getRedis } = require('../config/redis');
const logger = require('./logger');

const getCache = async (key) => {
  try {
    const raw = await getRedis().get(key);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    logger.warn(`[Cache] GET failed (${key}): ${err.message}`);
    return null;
  }
};

const setCache = async (key, data, ttlSeconds) => {
  try {
    await getRedis().set(key, JSON.stringify(data), 'EX', ttlSeconds);
  } catch (err) {
    logger.warn(`[Cache] SET failed (${key}): ${err.message}`);
  }
};

const delCache = async (key) => {
  try {
    await getRedis().del(key);
  } catch (err) {
    logger.warn(`[Cache] DEL failed (${key}): ${err.message}`);
  }
};

/**
 * Delete all keys matching a glob pattern (e.g. 'reviews:doctor:abc123:*').
 * Uses SCAN so it never blocks the Redis event loop.
 */
const delCacheByPattern = async (pattern) => {
  try {
    const redis = getRedis();
    const keys = [];
    const stream = redis.scanStream({ match: pattern, count: 100 });
    stream.on('data', (batch) => keys.push(...batch));
    await new Promise((resolve, reject) => {
      stream.on('end', resolve);
      stream.on('error', reject);
    });
    if (keys.length > 0) await redis.del(...keys);
  } catch (err) {
    logger.warn(`[Cache] DEL pattern failed (${pattern}): ${err.message}`);
  }
};

module.exports = { getCache, setCache, delCache, delCacheByPattern };
