import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from "typeorm";
import { Company } from "./Company";
import { User } from "./User";
import { ServiceField } from "../constants/serviceFields";

@Entity("services")
@Index(["companyId", "key"], { unique: true })
@Index(["companyId", "active", "sortOrder"])
export class Service {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "uuid" })
  companyId: string;

  @ManyToOne(() => Company, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "companyId" })
  company: Company;

  @Column({ type: "varchar", length: 80 })
  key: string;

  @Column({ type: "varchar", length: 120 })
  name: string;

  @Column({ type: "text", nullable: true })
  description: string | null;

  @Column({ type: "jsonb", default: () => "'[]'", nullable: true })
  tags: string[];

  @Column({ type: "boolean", default: true })
  active: boolean;

  @Column({ type: "boolean", default: false })
  allowCustomName: boolean;

  @Column({ type: "jsonb", default: () => "'[]'" })
  fields: ServiceField[];

  @Column({ type: "int", default: 0, nullable: true })
  sortOrder: number;

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
}
