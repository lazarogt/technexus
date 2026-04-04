import type { UserRole } from "@prisma/client";

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      actor?: {
        type: "user" | "guest";
        userId?: string;
        role?: UserRole;
        guestSessionId?: string;
      };
    }
  }
}

export {};
