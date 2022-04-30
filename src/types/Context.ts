import { Request, Response } from "express";
import { Session, SessionData } from "express-session";
import { Connection } from "typeorm";
import { buildDataLoaders } from "../utils/dataLoaders";
import { UserAuthPayload } from "./User/UserAuthPayload";
export interface Context {
  req: Request & {
    session: Session & Partial<SessionData> & { accessToken?: string };
  };
  res: Response;
  user: UserAuthPayload;
  connection: Connection;
  dataLoaders: ReturnType<typeof buildDataLoaders>;
}
