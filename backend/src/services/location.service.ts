import type { Prisma, Location } from "@prisma/client";
import { prisma } from "./prisma.service";

const defaultWarehouseName = "Default Warehouse";

type LocationClient = Pick<Prisma.TransactionClient, "location"> | typeof prisma;

export const ensureDefaultLocationForSeller = async (
  sellerId: string,
  client: LocationClient = prisma
): Promise<Location> => {
  const existing = await client.location.findFirst({
    where: {
      sellerId,
      deletedAt: null
    },
    orderBy: { createdAt: "asc" }
  });

  if (existing) {
    return existing;
  }

  return client.location.create({
    data: {
      sellerId,
      name: defaultWarehouseName
    }
  });
};
