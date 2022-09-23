import { Request, Response } from "express";
import { Session, SessionData } from "express-session";
import { Connection } from "typeorm";
import { buildDataLoaders } from "../utils/dataLoaders";
import { AdminAuthPayload, UserAuthPayload } from "./User/UserAuthPayload";
export interface Context {
  req: Request & {
    session: Session &
      Partial<SessionData> & { accessToken?: string; userId?: string };
  };
  res: Response;
  user: UserAuthPayload;
  connection: Connection;
  dataLoaders: ReturnType<typeof buildDataLoaders>;
}
export interface AdminContext {
  req: Request & {
    session: Session &
      Partial<SessionData> & { accessToken?: string; userId?: string };
  };
  res: Response;
  user: AdminAuthPayload;
  connection: Connection;
}
