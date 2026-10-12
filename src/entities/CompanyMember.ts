import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { User, UserRole } from "./User";
import { Company } from "./Company";
import { Role } from "./Roles";

@Entity("company_members")
@Index(["companyId", "userId"], { unique: true })
export class CompanyMember {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "uuid" })
  companyId: string;

  @ManyToOne(() => Company, (c) => c.members, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "companyId" })
  company?: Company;

  @Column({ type: "uuid" })
  userId: string;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user?: User;

  @Column({ type: "enum", enum: UserRole, default: UserRole.STAFF })
  role: UserRole;

  @Column({ type: "boolean", default: true })
  isActive: boolean;

  @Column({ type: "timestamptz", nullable: true })
  lastUsedAt: Date | null;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;

  @Column({ type: "uuid", nullable: true })
  roleId: string | null;

  @ManyToOne(() => Role, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "roleId" })
  assignedRole: Role | null;
}
