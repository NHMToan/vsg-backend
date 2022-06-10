import { JwtPayload } from "jsonwebtoken";

export type UserAuthPayload = JwtPayload & {
  userId: string;
  profileId: string;
};
