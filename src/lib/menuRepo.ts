import { prisma } from "./prisma";

export type MenuItemDTO = {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  createdAt: number;
};

export const menuRepo = {
  async list(): Promise<MenuItemDTO[]> {
    const rows = await (prisma as any).menuItem.findMany({ orderBy: { name: "asc" } });
    return (rows as any[]).map((m) => ({
      id: m.id,
      name: m.name,
      slug: m.slug,
      logoUrl: m.logoUrl ?? undefined,
      createdAt: m.createdAt.getTime(),
    }));
  },
  async upsert(data: { name: string; slug: string; logoUrl?: string }): Promise<MenuItemDTO> {
    const row = await (prisma as any).menuItem.upsert({
      where: { slug: data.slug },
      update: { name: data.name, logoUrl: data.logoUrl ?? null },
      create: { name: data.name, slug: data.slug, logoUrl: data.logoUrl ?? null },
    });
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      logoUrl: row.logoUrl ?? undefined,
      createdAt: row.createdAt.getTime(),
    };
  },
};
