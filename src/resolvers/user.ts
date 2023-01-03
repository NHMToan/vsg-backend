import argon2 from "argon2";
import {
  Arg,
  Ctx,
  FieldResolver,
  ID,
  Mutation,
  Query,
  Resolver,
  Root,
  UseMiddleware,
} from "type-graphql";
import { FORGET_PASSWORD_PREFIX, __prod__ } from "../constants";
import { Profile } from "../entities/Profile";
import { User } from "../entities/User";
import { checkAuth } from "../middleware/checkAuth";
import { Context } from "../types/Context";
import { FBLoginInput, LoginInput } from "../types/User/LoginInput";
import { RegisterInput } from "../types/User/RegisterInput";
import { UpdateUserInput } from "../types/User/UpdateUserInput";
import { UserMutationResponse } from "../types/User/UserMutationResponse";
import { generateRandomNumber } from "../utils";
import { createToken, sendRefreshToken } from "../utils/auth";
import { emailContent } from "../utils/forgotPasswordEmail";
import { sendEmail } from "../utils/sendEmail";
@Resolver((_of) => User)
export class UserResolver {
  @FieldResolver((_return) => String)
  async avatar(@Root() root: User) {
    const foundProfile = await Profile.findOne(root?.profileId);

    return foundProfile?.avatar || "";
  }

  @FieldResolver((_return) => String)
  async displayName(@Root() root: User) {
    const foundProfile = await Profile.findOne(root?.profileId);

    return foundProfile?.displayName || `${root.lastName}`;
  }

  @FieldResolver((_return) => Profile)
  async profile(@Root() root: User) {
    return await Profile.findOne(root.profileId);
  }

  @Query((_return) => [User])
  async users(): Promise<User[]> {
    return await User.find();
  }

  @Query((_return) => User, { nullable: true })
  @UseMiddleware(checkAuth)
  async me(@Ctx() { user }: Context): Promise<User | undefined | null> {
    const foundUser = await User.findOne(user.userId);
    return foundUser;
  }

  @Query((_return) => Profile, { nullable: true })
  @UseMiddleware(checkAuth)
  async myProfile(
    @Ctx() { user }: Context
  ): Promise<Profile | undefined | null> {
    const foundUser = await User.findOne(user.userId);

    const foundProfile = await Profile.findOne(foundUser?.profileId);

    return foundProfile;
  }

  @Mutation((_return) => UserMutationResponse)
  async login(
    @Arg("loginInput") { email, password }: LoginInput,
    @Ctx() { res }: Context
  ): Promise<UserMutationResponse> {
    try {
      const existingUser = await User.findOne({ email });

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
  async fbLogin(
    @Arg("fbLoginInput") { id, name }: FBLoginInput,
    @Ctx() { res }: Context
  ): Promise<UserMutationResponse> {
    try {
      const existingUser = await User.findOne({
        where: {
          provider: "facebook",
          email: id,
        },
      });

      if (!existingUser) {
        const newProfile = Profile.create({});
        newProfile.displayName = name;

        await newProfile.save();

        const newUser = User.create({
          email: id,
          provider: "facebook",
          lastName: name,
          profile: newProfile,
        });

        await newUser.save();

        const accessToken = createToken("accessToken", newUser);
        sendRefreshToken(res, newUser);

        return {
          code: 200,
          success: true,
          message: "Logged in successfully",
          user: newUser,
          accessToken,
        };
      } else {
        const accessToken = createToken("accessToken", existingUser);

        sendRefreshToken(res, existingUser);

        return {
          code: 200,
          success: true,
          message: "Logged in successfully",
          user: existingUser,
          accessToken,
        };
      }
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
  async register(
    @Arg("registerInput")
    registerInput: RegisterInput,
    @Ctx() { res }: Context
  ): Promise<UserMutationResponse> {
    const { email, password, lastName, firstName } = registerInput;

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return {
        code: 400,
        success: false,
        message: "Email is already existing, try with another email",
      };
    }

    const profile = Profile.create({});
    profile.displayName = lastName + (firstName ? ` ${firstName}` : "");
    await profile.save();

    const hashedPassword = await argon2.hash(password);

    const newUser = User.create({
      email,
      password: hashedPassword,
      lastName,
      firstName,
    });

    newUser.profile = profile;

    await newUser.save();

    const accessToken = createToken("accessToken", newUser);

    sendRefreshToken(res, newUser);

    return {
      code: 200,
      success: true,
      message: "User registration successful",
      user: newUser,
      accessToken,
    };
  }

  @Mutation(() => UserMutationResponse)
  async forgotPassword(@Arg("email") email: string, @Ctx() { res }: Context) {
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return {
        code: 400,
        success: false,
        message: "Email is not existing!",
      };
    }
    const code = generateRandomNumber(6);

    res.cookie(FORGET_PASSWORD_PREFIX + code, user.id, {
      httpOnly: true, // JS front end cannot access the cookie
      secure: __prod__, // cookie only works in https
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24,
    });

    await sendEmail(email, emailContent(code));
    return {
      code: 200,
      success: true,
      message: "Request to reset password is sent!",
    };
  }

  @Mutation(() => UserMutationResponse)
  async changePassword(
    @Arg("code") code: string,
    @Arg("newPassword") newPassword: string,
    @Ctx() { res, req }: Context
  ): Promise<UserMutationResponse> {
    if (newPassword.length <= 2) {
      return {
        code: 400,
        success: false,
        message: "Length must be greater than 2",
      };
    }

    const key = FORGET_PASSWORD_PREFIX + code;
    const userId = req.cookies[key];

    if (!userId) {
      return {
        code: 400,
        success: false,
        message: "Token is expired",
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

    res.clearCookie(key, {
      httpOnly: true,
      secure: __prod__,
      sameSite: "lax",
    });

    return {
      code: 200,
      success: true,
      message: "Password is changed successfully!",
    };
  }

  @Mutation((_return) => UserMutationResponse)
  @UseMiddleware(checkAuth)
  async updateUser(
    @Arg("updateUserInput") { firstName, lastName }: UpdateUserInput,
    @Ctx() { user }: Context
  ): Promise<UserMutationResponse> {
    const existingUser = await User.findOne(user.userId);

    if (!existingUser)
      return {
        code: 400,
        success: false,
        message: "User not found",
      };

    existingUser.firstName = firstName;
    existingUser.lastName = lastName;

    await existingUser.save();

    return {
      code: 200,
      success: true,
      message: "User updated successfully",
      user: existingUser,
    };
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
