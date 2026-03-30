import type { NextFunction, Request, Response } from "express";
import type { UserRole } from "@prisma/client";

export const requireRoles =
  (...roles: UserRole[]) =>
  (req: Request, res: Response, next: NextFunction) => {
    if (!req.actor || req.actor.type !== "user" || !req.actor.role) {
      res.status(401).json({ message: "Authentication is required." });
      return;
    }

    if (!roles.includes(req.actor.role)) {
      res.status(403).json({ message: "You do not have access to this resource." });
      return;
    }

    next();
  };

