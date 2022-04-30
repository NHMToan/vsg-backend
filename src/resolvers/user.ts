import argon2 from "argon2";
import {
  Arg,
  Ctx,
  ID,
  Mutation,
  Query,
  Resolver,
  UseMiddleware,
} from "type-graphql";
import { __prod__ } from "../constants";
import { User } from "../entities/User";
import { checkAuth } from "../middleware/checkAuth";
import { Context } from "../types/Context";
import { LoginInput } from "../types/User/LoginInput";
import { RegisterInput } from "../types/User/RegisterInput";
import { UpdateUserInput } from "../types/User/UpdateUserInput";
import { UserMutationResponse } from "../types/User/UserMutationResponse";
import { createToken, sendRefreshToken } from "../utils/auth";

@Resolver()
export class UserResolver {
  @Query((_return) => [User])
  async users(): Promise<User[]> {
    return await User.find();
  }

  @Query((_return) => User, { nullable: true })
  @UseMiddleware(checkAuth)
  async me(@Ctx() { user, req }: Context): Promise<User | undefined | null> {
    if (!req.session.accessToken) return null;
    const foundUser = await User.findOne(user.userId);
    return foundUser;
  }

  @Mutation((_return) => UserMutationResponse)
  async register(
    @Arg("registerInput")
    registerInput: RegisterInput
  ): Promise<UserMutationResponse> {
    const { username, password, invitedCode } = registerInput;

    if (!invitedCode || invitedCode !== process.env.INVITED_CODE) {
      return {
        code: 400,
        success: false,
        message: "Pls Input invited code wrongly!",
      };
    }

    const existingUser = await User.findOne({ username });

    if (existingUser) {
      return {
        code: 400,
        success: false,
        message: "Duplicated username",
      };
    }

    const hashedPassword = await argon2.hash(password);

    const newUser = User.create({
      username,
      password: hashedPassword,
    });

    await newUser.save();

    return {
      code: 200,
      success: true,
      message: "User registration successful",
      user: newUser,
    };
  }

  @Mutation((_return) => UserMutationResponse)
  @UseMiddleware(checkAuth)
  async updateUser(
    @Arg("updateUserInput") { name }: UpdateUserInput,
    @Ctx() { user }: Context
  ): Promise<UserMutationResponse> {
    const existingUser = await User.findOne(user.userId);

    if (!existingUser)
      return {
        code: 400,
        success: false,
        message: "User not found",
      };

    existingUser.name = name;

    await existingUser.save();

    return {
      code: 200,
      success: true,
      message: "User updated successfully",
      user: existingUser,
    };
  }

  @Mutation((_return) => UserMutationResponse)
  async login(
    @Arg("loginInput") { username, password }: LoginInput,
    @Ctx() { res }: Context
  ): Promise<UserMutationResponse> {
    try {
      const existingUser = await User.findOne({ username });

      if (!existingUser) {
        return {
          code: 400,
          success: false,
          message: "User not found",
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

      const accessToken = createToken("accessToken", existingUser);

      sendRefreshToken(res, existingUser);

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

  @Mutation((_return) => UserMutationResponse)
  async logout(
    @Arg("userId", (_type) => ID) userId: number,
    @Ctx() { res }: Context
  ): Promise<UserMutationResponse> {
    const existingUser = await User.findOne(userId);

    if (!existingUser) {
      return {
        code: 400,
        success: false,
      };
    }

    existingUser.tokenVersion += 1;

    await existingUser.save();

    res.clearCookie(process.env.REFRESH_TOKEN_COOKIE_NAME as string, {
      httpOnly: true,
      secure: __prod__,
      sameSite: "lax",
      path: "/refresh_token",
    });

    return { code: 200, success: true };
  }
}
