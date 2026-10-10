import type { VerifiedAccessToken } from "../utils/token";

declare global {
  namespace Express {
    interface Request {
      user?: VerifiedAccessToken;
    }
  }
}