
const mongoose = require('mongoose');

const uri = 'mongodb://127.0.0.1:27017/schoolManagementSystem';

(async () => {
  try {
    await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    console.log('collections:', collections.map((c) => c.name));

    for (const coll of collections) {
      const count = await db.collection(coll.name).countDocuments();
      console.log(`${coll.name}: ${count}`);
    }
  } catch (err) {
    console.error('error:', err);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
  }
})();
