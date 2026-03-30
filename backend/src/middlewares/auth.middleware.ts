import type { NextFunction, Request, Response } from "express";
import { prisma } from "../services/prisma.service";
import { verifyToken } from "../services/auth.service";

const getBearerToken = (authorizationHeader?: string) => {
  if (!authorizationHeader?.startsWith("Bearer ")) {
    return null;
  }

  return authorizationHeader.slice("Bearer ".length).trim();
};

export const optionalActor = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const token = getBearerToken(req.header("Authorization"));

  if (!token) {
    next();
    return;
  }

  try {
    const payload = verifyToken(token);

    if (payload.type === "user") {
      const user = await prisma.user.findUnique({
        where: { id: payload.sub }
      });

      if (!user || user.deletedAt || user.isBlocked) {
        req.actor = undefined;
        next();
        return;
      }

      req.actor = {
        type: "user",
        userId: user.id,
        role: user.role
      };
      next();
      return;
    }

    const session = await prisma.guestSession.findUnique({
      where: { id: payload.sub }
    });

    if (!session || session.deletedAt || session.expiresAt < new Date()) {
      req.actor = undefined;
      next();
      return;
    }

    req.actor = {
      type: "guest",
      guestSessionId: session.id
    };
    next();
  } catch {
    req.actor = undefined;
    next();
  }
};

export const requireActor = (req: Request, res: Response, next: NextFunction) => {
  if (!req.actor) {
    res.status(401).json({ message: "Authentication token is required." });
    return;
  }

  next();
};

export const requireUserAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.actor || req.actor.type !== "user" || !req.actor.userId || !req.actor.role) {
    res.status(401).json({ message: "Authentication token is required." });
    return;
  }

  next();
};

