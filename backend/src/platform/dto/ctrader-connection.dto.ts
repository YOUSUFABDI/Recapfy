export class CTraderConnectionDto {
  id!: string;
  label?: string | null;
  spotwareUserId?: string | null;
  spotwareUsername?: string | null;
  createdAt!: string;
  updatedAt!: string;

  static fromPrisma(row: {
    id: string;
    label: string | null;
    spotwareUserId: string | null;
    spotwareUsername: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): CTraderConnectionDto {
    return {
      id: row.id,
      label: row.label,
      spotwareUserId: row.spotwareUserId,
      spotwareUsername: row.spotwareUsername,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
