import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { User } from "./User";

export enum LogAction {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  RESTORE = "restore",
  LOGIN = "login",
  LOGOUT = "logout",
  LOGIN_FAILED = "login_failed",
  PASSWORD_RESET = "password_reset",
  PASSWORD_CHANGE = "password_change",
}

export enum LogEntity {
  CUSTOMER = "customer",
  USER = "user",
  ROLE = "role",
  SERVICE = "service",
  COMPANY = "company",
  AUTH = "auth",
}

export type LogChange = { field: string; from: unknown; to: unknown };

@Entity("activity_logs")
@Index(["createdAt"])
@Index(["entity", "entityId"])
@Index(["actorId", "createdAt"])
export class ActivityLog {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;

  @Column({ type: "uuid", nullable: true })
  actorId: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "actorId" })
  actor?: User | null;

  @Column({ type: "varchar", length: 150, nullable: true })
  actorName: string | null;

  @Column({ type: "enum", enum: LogAction })
  action: LogAction;

  @Column({ type: "enum", enum: LogEntity })
  entity: LogEntity;

  @Column({ type: "varchar", length: 64, nullable: true })
  entityId: string | null;

  @Column({ type: "varchar", length: 255 })
  summary: string;

  @Column({ type: "jsonb", nullable: true })
  changes: LogChange[] | null;

  @Column({ type: "varchar", length: 64, nullable: true })
  ip: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  userAgent: string | null;
}