import express from "express";
import { Secret, verify } from "jsonwebtoken";
import { Admin } from "../entities/Admin";
import { UserAuthPayload } from "../types/User/UserAuthPayload";
import { createAdminToken, sendAdminRefreshToken } from "../utils/adminAuth";

const router = express.Router();

router.get("/", async (req, res) => {
  const refreshToken =
    req.cookies[process.env.ADMIN_REFRESH_TOKEN_COOKIE_NAME as string];
  console.log(
    "Refresh Token:",
    refreshToken,
    process.env.ADMIN_REFRESH_TOKEN_COOKIE_NAME
  );
  if (!refreshToken) return res.sendStatus(401);

  try {
    const decodedUser = verify(
      refreshToken,
      process.env.ADMIN_REFRESH_TOKEN_SECRET as Secret
    ) as UserAuthPayload;

    const existingUser = await Admin.findOne(decodedUser.userId);

    if (!existingUser) {
      console.log("Existing user", existingUser);
      console.log("Decoded user", decodedUser);
      return res.sendStatus(401);
    }

    sendAdminRefreshToken(res, existingUser);

    return res.json({
      success: true,
      accessToken: createAdminToken("accessToken", existingUser),
    });
  } catch (error) {
    console.log("ERROR REFRESHING TOKEN", error);
    return res.sendStatus(403);
  }
});

export default router;
