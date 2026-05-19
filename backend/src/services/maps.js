const axios = require('axios');
const logger = require('../config/logger');

const MAPS_BASE = 'https://maps.googleapis.com/maps/api/distancematrix/json';

/**
 * Get drive time and distance between two Indian cities.
 * Returns null elements on any failure — callers handle gracefully.
 */
const getDriveTime = async (originCity, destinationCity) => {
  if (!process.env.GOOGLE_MAPS_API_KEY) {
    logger.warn('[Maps] GOOGLE_MAPS_API_KEY not set — returning mock distance');
    return _mockResult(originCity, destinationCity);
  }

  if (!originCity || !destinationCity) return null;

  try {
    const { data } = await axios.get(MAPS_BASE, {
      params: {
        origins: `${originCity}, India`,
        destinations: `${destinationCity}, India`,
        key: process.env.GOOGLE_MAPS_API_KEY,
        mode: 'driving',
        units: 'metric',
        language: 'en',
      },
      timeout: 5000,
    });

    if (data.status !== 'OK') {
      logger.warn(`[Maps] API status: ${data.status}`);
      return null;
    }

    const element = data.rows?.[0]?.elements?.[0];
    if (!element || element.status !== 'OK') return null;

    return {
      origin: data.origin_addresses?.[0] || originCity,
      destination: data.destination_addresses?.[0] || destinationCity,
      distance_text: element.distance.text,
      distance_meters: element.distance.value,
      duration_text: element.duration.text,
      duration_seconds: element.duration.value,
    };
  } catch (err) {
    logger.error('[Maps] Distance Matrix API error:', err.message);
    return null;
  }
};

const _mockResult = (origin, destination) => ({
  origin: `${origin}, India`,
  destination: `${destination}, India`,
  distance_text: 'N/A (Maps API not configured)',
  distance_meters: 0,
  duration_text: 'N/A',
  duration_seconds: 0,
  _mock: true,
});

module.exports = { getDriveTime };
