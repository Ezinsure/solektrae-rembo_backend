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

// One row per active (or previously active) login session. We never store
// the raw refresh token — only a sha256 hash of it — so a database leak
// alone can't be used to impersonate a session.
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

  @Column({ type: "timestamp" })
  expiresAt: Date;

  // null = still active. Set on logout, on rotation (old token retired),
  // or on breach-detection (see auth.service.ts refresh()).
  @Column({ type: "timestamp", nullable: true })
  revokedAt: Date | null;

  @Column({ type: "varchar", nullable: true })
  userAgent: string | null;

  @Column({ type: "varchar", nullable: true })
  ipAddress: string | null;

  @CreateDateColumn({ type: "timestamp" })
  createdAt: Date;
}
