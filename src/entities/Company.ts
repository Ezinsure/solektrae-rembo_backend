import {
  Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany,
  PrimaryGeneratedColumn, UpdateDateColumn,
} from "typeorm";
import { User } from "./User";
import { CompanyMember } from "./CompanyMember";

@Entity("companies")
export class Company {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar", length: 120 })
  name: string;


  @Column({ type: "varchar", length: 80, unique: true })
  slug: string;

  @Column({ type: "varchar", length: 150, nullable: true })
  email: string | null;

  @Column({ type: "varchar", length: 20, nullable: true })
  phoneNumber: string | null;

  @Column({ type: "text", nullable: true })
  about: string | null;

  @Column({ type: "varchar", nullable: true })
  logoUrl: string | null;

  @Column({ type: "boolean", default: true })
  isActive: boolean;

  @OneToMany(() => CompanyMember, (m) => m.company)
  members?: CompanyMember[];

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;

  @Column({ type: "uuid", nullable: true })
  createdById: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "createdById" })
  createdBy?: User | null;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt: Date;

  @Column({ type: "uuid", nullable: true })
  updatedById: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "updatedById" })
  updatedBy?: User | null;
}