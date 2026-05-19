require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const connectDB = require('../src/config/db');

require('../src/models/User');
require('../src/models/UserPlan');
require('../src/models/Patient');
require('../src/models/Doctor');
require('../src/models/WeeklyTemplate');
require('../src/models/DailySchedule');
require('../src/models/Appointment');
require('../src/models/Payment');
require('../src/models/Prescription');
require('../src/models/Review');

const run = async () => {
  await connectDB();
  const collections = mongoose.connection.collections;

  for (const [name, collection] of Object.entries(collections)) {
    const indexes = await collection.indexes();
    console.log(`\n[${name}] ${indexes.length} index(es):`);
    indexes.forEach((idx) => console.log('  -', JSON.stringify(idx.key)));
  }

  console.log('\n✅ Index verification complete.');
  process.exit(0);
};

run().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
