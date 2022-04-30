import { Response } from "express";
import { Secret, sign } from "jsonwebtoken";
import { __prod__ } from "../constants";
import { User } from "../entities/User";

export const createToken = (type: "accessToken" | "refreshToken", user: User) =>
  sign(
    {
      userId: user.id,
      ...(type === "refreshToken" ? { tokenVersion: user.tokenVersion } : {}),
    },
    type === "accessToken"
      ? (process.env.ACCESS_TOKEN_SECRET as Secret)
      : (process.env.REFRESH_TOKEN_SECRET as Secret),
    {
      expiresIn: type === "accessToken" ? "2h" : "7d",
    }
  );

export const sendRefreshToken = (res: Response, user: User) => {
  res.cookie(
    process.env.REFRESH_TOKEN_COOKIE_NAME as string,
    createToken("refreshToken", user),
    {
      httpOnly: true, // JS front end cannot access the cookie
      secure: __prod__, // cookie only works in https
      sameSite: "lax",
      path: "/refresh_token",
    }
  );
};
