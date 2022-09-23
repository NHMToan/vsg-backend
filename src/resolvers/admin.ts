import argon2 from "argon2";
import {
  Arg,
  Ctx,
  ID,
  Int,
  Mutation,
  Query,
  Resolver,
  UseMiddleware,
} from "type-graphql";
import { FindManyOptions } from "typeorm";
import { ADMIN_CREATE_KEY, __prod__ } from "../constants";
import { Admin } from "../entities/Admin";
import { User } from "../entities/User";
import { checkAdminAuth } from "../middleware/checkAuth";
import {
  AdminLoginInput,
  AdminMutationResponse,
  AdminRegisterInput,
  Users,
} from "../types/Admin";
import { AdminContext } from "../types/Context";
import { UserMutationResponse } from "../types/User/UserMutationResponse";
import { createAdminToken, sendAdminRefreshToken } from "../utils/adminAuth";
@Resolver((_of) => Admin)
export class AdminResolver {
  @Mutation((_return) => AdminMutationResponse)
  async adminLogin(
    @Arg("adminLoginInput") { account, password }: AdminLoginInput,
    @Ctx() { res }: AdminContext
  ): Promise<AdminMutationResponse> {
    try {
      const existingUser = await Admin.findOne({ account });

      if (!existingUser) {
        return {
          code: 400,
          success: false,
          message: "Account not found",
        };
      }

      const isPasswordValid = await argon2.verify(
        existingUser.password,
        password
      );

      if (!isPasswordValid) {
        return {
          code: 400,
          success: false,
          message: "Incorrect password",
        };
      }

      const accessToken = createAdminToken("accessToken", existingUser);

      sendAdminRefreshToken(res, existingUser);

      return {
        code: 200,
        success: true,
        message: "Logged in successfully",
        user: existingUser,
        accessToken,
      };
    } catch (error) {
      console.log(error);
      return {
        code: 500,
        success: false,
        message: `Internal server error ${error.message}`,
      };
    }
  }

  @Mutation((_return) => AdminMutationResponse)
  async adminRegister(
    @Arg("adminRegisterInput")
    adminRegisterInput: AdminRegisterInput,
    @Ctx() { res }: AdminContext
  ): Promise<AdminMutationResponse> {
    const { account, password, key } = adminRegisterInput;

    if (!key || key !== ADMIN_CREATE_KEY) {
      return {
        code: 400,
        success: false,
        message: "Key is unauthenticated!",
      };
    }
    const existingUser = await Admin.findOne({ account });

    if (existingUser) {
      return {
        code: 400,
        success: false,
        message: "Account is already existing, try with another email",
      };
    }

    const hashedPassword = await argon2.hash(password);

    const newUser = Admin.create({
      account,
      password: hashedPassword,
    });

    await newUser.save();

    const accessToken = createAdminToken("accessToken", newUser);

    sendAdminRefreshToken(res, newUser);

    return {
      code: 200,
      success: true,
      message: "User registration successful",
      user: newUser,
      accessToken,
    };
  }

  @Mutation((_return) => AdminMutationResponse)
  async adminLogout(
    @Arg("userId", (_type) => ID) userId: number,
    @Ctx() { res }: AdminContext
  ): Promise<AdminMutationResponse> {
    const existingUser = await Admin.findOne(userId);

    if (!existingUser) {
      return {
        code: 400,
        success: false,
      };
    }

    await existingUser.save();

    res.clearCookie(process.env.REFRESH_TOKEN_COOKIE_NAME as string, {
      httpOnly: true,
      secure: __prod__,
      sameSite: "lax",
      path: "/refresh_token",
    });

    return { code: 200, success: true };
  }

  @Query((_return) => Users, { nullable: true })
  @UseMiddleware(checkAdminAuth)
  async getUsers(
    @Arg("limit", (_type) => Int!, { nullable: true }) limit: number,
    @Arg("offset", (_type) => Int!, { nullable: true }) offset: number,
    @Arg("ordering", (_type) => String!, { nullable: true }) ordering: string
  ): Promise<Users | null> {
    try {
      const totalPostCount = await User.count();
      const realLimit = limit || 50;
      const realOffset = offset || 0;

      const orderingField = ordering || "email";

      const findOptions: FindManyOptions<User> = {
        order: {
          [orderingField]: ordering?.startsWith("-") ? "DESC" : "ASC",
        },
        take: realLimit,
        skip: realOffset,
        relations: ["profile"],
      };

      const users = await User.find(findOptions);

      let hasMore = realLimit + realOffset < totalPostCount;
      return {
        totalCount: totalPostCount,
        hasMore,
        results: users,
      };
    } catch (error) {
      console.log(error);
      return null;
    }
  }

  @Mutation(() => UserMutationResponse)
  @UseMiddleware(checkAdminAuth)
  async adminChangePassUser(
    @Arg("userId", (_type) => ID) userId: string,
    @Arg("newPassword") newPassword: string
  ): Promise<UserMutationResponse> {
    if (newPassword.length <= 2) {
      return {
        code: 400,
        success: false,
        message: "Length must be greater than 2",
      };
    }

    if (!userId) {
      return {
        code: 400,
        success: false,
        message: "Wrong user",
      };
    }
    const user = await User.findOne(userId);
    if (!user) {
      return {
        code: 400,
        success: false,
        message: "User is no longer exists",
      };
    }

    const hashedPassword = await argon2.hash(newPassword);
    await User.update(
      { id: userId },
      {
        password: hashedPassword,
      }
    );

    return {
      code: 200,
      success: true,
      message: "Password is changed successfully!",
    };
  }
}
