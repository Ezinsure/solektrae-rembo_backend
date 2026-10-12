import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Index,
} from "typeorm";
import { User } from "./User";
import { Company } from "./Company";
import { Service } from "./Service";

export enum CustomerStatus {
  PENDING = "pending",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
}

@Entity("customers")
@Index(["companyId", "createdAt"])
@Index(["companyId", "serviceId"])
@Index(["companyId", "status"])
export class Customer {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "uuid" })
  companyId: string;

  @ManyToOne(() => Company, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "companyId" })
  company: Company;

  @Column({ type: "varchar" })
  names: string;

  @Column({ type: "varchar" })
  email: string;

  @Column({ type: "varchar" })
  phoneNumber: string;

  @Column({ type: "uuid", nullable: true })
  serviceId: string | null;

  @ManyToOne(() => Service, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "serviceId" })
  serviceRef: Service | null;

  //  for "Other services"
  @Column({ type: "varchar", nullable: true })
  service: string | null;

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

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt: Date;

  @DeleteDateColumn({ type: "timestamptz", nullable: true })
  deletedAt: Date | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: "updatedBy" })
  updatedBy: User | null;
}
