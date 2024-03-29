import { JwtPayload } from "jsonwebtoken";

export type UserAuthPayload = JwtPayload & {
  userId: string;
  profileId: string;
};
export type AdminAuthPayload = JwtPayload & {
  userId: string;
};
