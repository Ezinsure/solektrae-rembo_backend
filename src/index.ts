import dotenv from "dotenv";
import "reflect-metadata";
import { AppDataSource } from "./config/database";
import express from "express";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import cors from "cors";
import routes from "./routes/page";
import { errorHandler } from "./middleware/errorHandle";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 9000;

app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  }),
);
app.use(express.json());
app.use(cookieParser());

// ROUTES
app.use("/v1/erembo", routes);

// Global Error Handler
app.use(errorHandler);

// Database Connection
const startServer = async () => {
  try {
    await AppDataSource.initialize();
    console.log("Database connected successfully");
    app.listen(PORT, () => {
      console.log(`Server is running on : http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Database connection error:", error);
    process.exit(1);
  }
};
startServer();
