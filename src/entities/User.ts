import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from "typeorm";

export enum UserRole {
  ADMIN = "admin",
  HR = "hr",
  DEV = "dev",
  USER = "user",
  STAFF = "staff",
}

@Entity("users")
export class User {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar", length: 100 })
  names: string;

  @Column({ unique: true, type: "varchar" })
  email: string;

  @Column({ select: false, type: "varchar" })
  password: string;

  @Column({ type: "enum", enum: UserRole, default: UserRole.USER })
  role: UserRole;

  @Column({ type: "varchar", length: 20 })
  phoneNumber: string;

  @Column({
    type: "varchar",
    nullable: true,
  })
  profileImage: string | null;

  @Column({ default: true, type: "boolean" })
  isActive: boolean;

  @Column({ default: true, type: "boolean" })
  mustChangePassword: boolean;

  @CreateDateColumn({ type: "timestamp" })
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamp" })
  updatedAt: Date;

  @DeleteDateColumn({ type: "timestamp", nullable: true })
  deletedAt: Date | null;

  @Column({ type: "uuid", nullable: true })
  createdById: string | null;
}
