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
import { Service } from "./Service";

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

  @Column({ type: "varchar" })
  height: string;

  @Column({ type: "varchar" })
  hovName: string; // head of village name

  @Column({ type: "varchar" })
  hovNumber: string; // head of village phone number

  @Column({ type: "varchar" })
  district: string;

  @Column({ type: "varchar" })
  sector: string;

  @Column({ type: "varchar" })
  cell: string;

  @Column({ type: "varchar" })
  village: string;

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
}
