import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from "typeorm";
import { Company } from "./Company";
import { User, UserRole } from "./User";

@Entity("roles")
@Index(["companyId", "name"], { unique: true })
export class Role {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "uuid" })
  companyId: string;

  @ManyToOne(() => Company, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "companyId" })
  company: Company;

  @Column({ type: "varchar" })
  name: string;

  @Column({ type: "varchar", nullable: true })
  description: string | null;

  @Column({ type: "enum", enum: UserRole, default: UserRole.STAFF })
  baseRole: UserRole;

  @Column({ type: "boolean", default: false })
  isSystem: boolean;

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
}
