import { PlatformConnectionDT } from "./platform-connection";

export type UserDT = {
  id: string;
  email?: string;
  name?: string;
  avatarUrl?: string;
  googleId?: string;
  role?: string;
  hasPassword: boolean;
  hasAccess: boolean;
  status: boolean;
  createdAt: string;
  updatedAt: string;
  platformConnections: PlatformConnectionDT[];
};
