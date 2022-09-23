import { Response } from "express";
import { Secret, sign } from "jsonwebtoken";
import { __prod__ } from "../constants";
import { Admin } from "../entities/Admin";

export const createAdminToken = (
  type: "accessToken" | "refreshToken",
  user: Admin
) =>
  sign(
    {
      userId: user.id,
    },
    type === "accessToken"
      ? (process.env.ACCESS_TOKEN_SECRET as Secret)
      : (process.env.REFRESH_TOKEN_SECRET as Secret),
    {
      expiresIn: type === "accessToken" ? "7d" : "14d",
    }
  );

export const sendAdminRefreshToken = (res: Response, user: Admin) => {
  res.cookie(
    process.env.REFRESH_TOKEN_COOKIE_NAME as string,
    createAdminToken("refreshToken", user),
    {
      httpOnly: true, // JS front end cannot access the cookie
      secure: __prod__, // cookie only works in https
      sameSite: "lax",
      path: "/refresh_token",
    }
  );
};
