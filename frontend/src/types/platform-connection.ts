export type PlatformConnectionDT = {
  id: string;
  userId: string;
  platfrom: string;
  label: string | null;
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  spotwareUserId?: string | null;
  spotwareUsername?: string | null;
  createdAt: string;
  updatedAt: string;
};
