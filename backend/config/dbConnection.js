const mongoose = require('mongoose');

const connectDb = async () => {
  try {
    const connect = await mongoose.connect(process.env.CONNECTION_STRING);
    console.log('Database connected:', connect.connection.name);
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    process.exit(1); // FIX: was process.exit.exit(1) — TypeError
  }
};

module.exports = connectDb;