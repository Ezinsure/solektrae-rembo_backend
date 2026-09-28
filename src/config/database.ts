import dotenv from "dotenv";
import "reflect-metadata";
import { DataSource } from "typeorm";
import path from "path";

dotenv.config();

export const AppDataSource = new DataSource({
  type: "postgres",
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || "5432"),
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  // ssl: { rejectUnauthorized: false },
  synchronize: false,
  logging: true,
  entities: [path.join(__dirname, "..", "entities", "**/*.{ts,js}")],
  migrations: [path.join(__dirname, "..", "migrations", "*.{ts,js}")],
  subscribers: [],
});
