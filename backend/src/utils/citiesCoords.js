/**
 * GeoJSON coordinates for top Indian cities.
 * Format: [longitude, latitude] — MongoDB 2dsphere requires this order.
 * Keys are lowercase and normalised (no spaces) for lookup.
 */
const CITIES = {
  mumbai:         [72.8777, 19.0760],
  delhi:          [77.1025, 28.7041],
  'new delhi':    [77.2090, 28.6139],
  bangalore:      [77.5946, 12.9716],
  bengaluru:      [77.5946, 12.9716],
  hyderabad:      [78.4867, 17.3850],
  chennai:        [80.2707, 13.0827],
  kolkata:        [88.3639, 22.5726],
  pune:           [73.8567, 18.5204],
  ahmedabad:      [72.5714, 23.0225],
  surat:          [72.8311, 21.1702],
  jaipur:         [75.7873, 26.9124],
  lucknow:        [80.9462, 26.8467],
  kanpur:         [80.3319, 26.4499],
  nagpur:         [79.0882, 21.1458],
  indore:         [75.8577, 22.7196],
  bhopal:         [77.4126, 23.2599],
  visakhapatnam:  [83.2185, 17.6868],
  vizag:          [83.2185, 17.6868],
  patna:          [85.1376, 25.5941],
  vadodara:       [73.1812, 22.3072],
  baroda:         [73.1812, 22.3072],
  ghaziabad:      [77.4538, 28.6692],
  ludhiana:       [75.8573, 30.9010],
  agra:           [78.0081, 27.1767],
  nashik:         [73.7898, 19.9975],
  meerut:         [77.7064, 28.9845],
  rajkot:         [70.8022, 22.3039],
  varanasi:       [82.9739, 25.3176],
  amritsar:       [74.8723, 31.6340],
  allahabad:      [81.8463, 25.4358],
  prayagraj:      [81.8463, 25.4358],
  howrah:         [88.2636, 22.5958],
  coimbatore:     [76.9558, 11.0168],
  vijayawada:     [80.6480, 16.5062],
  madurai:        [78.1198, 9.9252],
  thane:          [72.9781, 19.2183],
  'navi mumbai':  [73.0297, 19.0330],
  noida:          [77.3910, 28.5355],
  gurugram:       [77.0266, 28.4595],
  gurgaon:        [77.0266, 28.4595],
  faridabad:      [77.3178, 28.4089],
  kochi:          [76.2673, 9.9312],
  cochin:         [76.2673, 9.9312],
  chandigarh:     [76.7794, 30.7333],
  mysore:         [76.6394, 12.2958],
  mysuru:         [76.6394, 12.2958],
  jabalpur:       [79.9864, 23.1815],
  gwalior:        [78.1828, 26.2183],
  jodhpur:        [73.0243, 26.2389],
  raipur:         [81.6296, 21.2514],
  kota:           [75.8648, 25.2138],
  ranchi:         [85.3096, 23.3441],
  dehradun:       [78.0322, 30.3165],
  bhubaneswar:    [85.8245, 20.2961],
  thiruvananthapuram: [76.9366, 8.5241],
  trivandrum:     [76.9366, 8.5241],
  guwahati:       [91.7362, 26.1445],
};

/**
 * Look up [lng, lat] for a city name.
 * Returns null if not found.
 */
const getCityCoords = (cityName) => {
  if (!cityName) return null;
  const key = cityName.trim().toLowerCase();
  return CITIES[key] || null;
};

module.exports = { getCityCoords, CITIES };
