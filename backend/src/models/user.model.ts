import type { User } from "@prisma/client";

export const toPublicUser = (user: User) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  isBlocked: user.isBlocked,
  createdAt: user.createdAt.toISOString()
});

