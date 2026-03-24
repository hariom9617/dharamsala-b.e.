import mongoose from "mongoose";

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    return conn; // Return the connection object
  } catch (error) {
    console.error(":x: MongoDB connection failed:", error.message);
    process.exit(1);
  }
};

export default connectDB;