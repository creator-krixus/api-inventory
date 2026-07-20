import mongoose from "mongoose";

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_DB_URI);

    console.log("✅ Base de datos conectada");
  } catch (error) {
    console.error("❌ Error conectando a MongoDB:", error.message);

    process.exit(1);
  }
};

export default connectDB;