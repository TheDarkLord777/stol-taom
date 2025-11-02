import { dbTry } from "./dbTry";
import { prisma } from "./prisma";

export type RestaurantDTO = {
  id: string;
  name: string;
  logoUrl?: string;
  createdAt: number;
};

export const restaurantRepo = {
  async list(): Promise<RestaurantDTO[]> {
    const rows = await dbTry(() =>
      prisma.restaurant.findMany({ orderBy: { name: "asc" } }),
    );
    return (
      rows as {
        id: string;
        name: string;
        logoUrl?: string | null;
        createdAt: Date;
      }[]
    ).map((r) => ({
      id: r.id,
      name: r.name,
      logoUrl: r.logoUrl ?? undefined,
      createdAt: r.createdAt.getTime(),
    }));
  },
  async upsert(data: {
    name: string;
    logoUrl?: string;
  }): Promise<RestaurantDTO> {
    const slugName = data.name.trim();
    const row = await dbTry(() =>
      prisma.restaurant.upsert({
        where: { name: slugName },
        update: { logoUrl: data.logoUrl ?? null },
        create: { name: slugName, logoUrl: data.logoUrl ?? null },
      }),
    );
    return {
      id: row.id,
      name: row.name,
      logoUrl: row.logoUrl ?? undefined,
      createdAt: row.createdAt.getTime(),
    };
  },
};
