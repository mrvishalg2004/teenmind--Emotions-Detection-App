import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/teenmind';

    const options = {
      maxPoolSize: 10, // Maintain up to 10 socket connections
      serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
    };

    const conn = await mongoose.connect(mongoURI, options);

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📊 Database Name: ${conn.connection.name}`);

    // Graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\n⚡ SIGINT received');
      console.log('🔌 Closing MongoDB connection');
      await mongoose.connection.close();
      console.log('✅ MongoDB connection closed');
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.log('⚡ SIGTERM received');
      console.log('🔌 Closing MongoDB connection');
      await mongoose.connection.close();
      console.log('✅ MongoDB connection closed');
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Database connection error:', error.message);
    console.log('ℹ️ MongoDB connection failed - continuing without database (development mode)');

    // In development, continue without database connection
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
};

// Handle MongoDB errors after initial connection
mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('⚠️ MongoDB disconnected');
});

mongoose.connection.on('reconnected', () => {
  console.log('✅ MongoDB reconnected');
});

export default connectDB;