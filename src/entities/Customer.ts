import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from "typeorm";
import { User } from "./User";

export enum CustomerStatus {
  PENDING = "pending",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
}

@Entity("customers")
export class Customer {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar" })
  names: string;

  @Column({ type: "varchar" })
  email: string;

  @Column({ type: "varchar" })
  phoneNumber: string;

  @Column({ type: "varchar" })
  service: string;

  @Column({ type: "varchar", nullable: true })
  height: string | null;

  @Column({ type: "varchar", nullable: true })
  hovName: string | null;

  @Column({ type: "varchar", nullable: true })
  hovNumber: string | null;

  @Column({ type: "varchar", nullable: true })
  fatherName: string | null;

  @Column({ type: "varchar", nullable: true })
  motherName: string | null;

  @Column({ type: "varchar", nullable: true })
  spouseName: string | null;

  @Column({ type: "varchar", nullable: true })
  district: string | null;

  @Column({ type: "varchar", nullable: true })
  sector: string | null;

  @Column({ type: "varchar", nullable: true })
  cell: string | null;

  @Column({ type: "varchar", nullable: true })
  street: string | null;

  @Column({ type: "varchar", nullable: true })
  village: string | null;

  @Column({
    type: "enum",
    enum: CustomerStatus,
    default: CustomerStatus.PENDING,
  })
  status: CustomerStatus;

  @CreateDateColumn({ type: "timestamp" })
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamp" })
  updatedAt: Date;

  @DeleteDateColumn({ type: "timestamp", nullable: true })
  deletedAt: Date | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: "updatedBy" })
  updatedBy: User | null;
}
