import type { NextFunction, Request, Response } from "express";
import { verifyAuthToken } from "./auth";
import { findUserById, type UserRole } from "./users";

const getBearerToken = (authorizationHeader?: string): string | null => {
  if (!authorizationHeader?.startsWith("Bearer ")) {
    return null;
  }

  return authorizationHeader.slice("Bearer ".length).trim();
};

export const requireAuth = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const token = getBearerToken(req.header("Authorization"));

  if (!token) {
    res.status(401).json({ message: "Authentication token is required." });
    return;
  }

  void (async () => {
    try {
      const tokenPayload = verifyAuthToken(token);
      const user = await findUserById(tokenPayload.userId);

      if (!user) {
        res.status(401).json({ message: "Authentication user was not found." });
        return;
      }

      if (user.isBlocked) {
        res.status(403).json({ message: "This account is blocked." });
        return;
      }

      req.auth = {
        userId: user.id,
        role: user.role
      };
      next();
    } catch {
      res.status(401).json({ message: "Invalid or expired authentication token." });
    }
  })();
};

export const authorizeRoles =
  (...allowedRoles: UserRole[]) =>
  (req: Request, res: Response, next: NextFunction): void => {
    if (!req.auth) {
      res.status(401).json({ message: "Authentication is required." });
      return;
    }

    if (!allowedRoles.includes(req.auth.role)) {
      res.status(403).json({ message: "You do not have access to this resource." });
      return;
    }
    next();
  };
