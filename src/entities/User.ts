import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  JoinColumn,
  ManyToOne,
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

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;

  @Column({ type: "uuid", nullable: true })
  createdById: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "createdById" })
  createdBy: User | null;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt: Date;

  @Column({ type: "uuid", nullable: true })
  updatedById: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "updatedById" })
  updatedBy: User | null;

  @DeleteDateColumn({ type: "timestamptz", nullable: true })
  deletedAt: Date | null;

  @Column({ type: "uuid", nullable: true })
  deletedById: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "deletedById" })
  deletedBy: User | null;
}
