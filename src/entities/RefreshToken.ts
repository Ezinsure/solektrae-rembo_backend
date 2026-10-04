import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from "typeorm";
import { User } from "./User";

@Entity("refresh_tokens")
export class RefreshToken {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "userId" })
  user: User;

  @Column({ type: "uuid" })
  userId: string;

  @Index({ unique: true })
  @Column({ type: "varchar" })
  tokenHash: string;

  @Column({ type: "timestamptz"})
  expiresAt: Date;

  @Column({ type: "timestamptz", nullable: true })
  revokedAt: Date | null;

  @Column({ type: "varchar", nullable: true })
  userAgent: string | null;

  @Column({ type: "varchar", nullable: true })
  ipAddress: string | null;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;
}
