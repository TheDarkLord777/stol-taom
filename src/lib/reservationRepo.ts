import { prisma } from "./prisma";

export type ReservationDTO = {
  id: string;
  restaurantId: string;
  userId?: string;
  fromDate: string; // ISO
  toDate?: string; // ISO
  partySize?: number;
  note?: string;
  createdAt: string; // ISO
};

export const reservationRepo = {
  async create(data: {
    restaurantId: string;
    userId?: string;
    fromDate: Date;
    toDate?: Date;
    partySize?: number;
    note?: string;
  }): Promise<ReservationDTO> {
    const row = await (prisma as any).reservation.create({
      data: {
        restaurantId: data.restaurantId,
        userId: data.userId ?? null,
        fromDate: data.fromDate,
        toDate: data.toDate ?? null,
        partySize: data.partySize ?? null,
        note: data.note ?? null,
      },
    });
    return {
      id: row.id,
      restaurantId: row.restaurantId,
      userId: row.userId ?? undefined,
      fromDate: new Date(row.fromDate).toISOString(),
      toDate: row.toDate ? new Date(row.toDate).toISOString() : undefined,
      partySize: row.partySize ?? undefined,
      note: row.note ?? undefined,
      createdAt: new Date(row.createdAt).toISOString(),
    };
  },
};
