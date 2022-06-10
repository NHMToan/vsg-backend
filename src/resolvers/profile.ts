import {
  Arg,
  Ctx,
  FieldResolver,
  ID,
  Int,
  Mutation,
  Query,
  Resolver,
  Root,
  UseMiddleware,
} from "type-graphql";
import { FindManyOptions, ILike, Not } from "typeorm";
import { Following } from "../entities/Following";
import { Friendship } from "../entities/Friendship";
import { Profile } from "../entities/Profile";
import { User } from "../entities/User";
import { checkAuth } from "../middleware/checkAuth";
import { S3Service } from "../services/uploader";
import { Context } from "../types/Context";
import { Profiles } from "../types/Post/Profiles";
import { ProfileMutationResponse } from "../types/Profile/ProfileMutationResponse";
import { UpdateProfileInput } from "../types/Profile/UpdateProfileInput";
@Resolver((_of) => Profile)
export class ProfileResolver {
  @FieldResolver((_return) => Boolean)
  @UseMiddleware(checkAuth)
  async isFollowing(@Root() root: Profile, @Ctx() { user }: Context) {
    const currentUser = await User.findOne(user.userId);

    const foundFollow = await Following.find({
      where: {
        follower: {
          id: currentUser?.profileId,
        },
        followedTo: {
          id: root.id,
        },
      },
    });
    if (foundFollow.length > 0) return true;
    return false;
  }

  @FieldResolver((_return) => Boolean)
  @UseMiddleware(checkAuth)
  async isFriend(@Root() root: Profile, @Ctx() { user }: Context) {
    const currentUser = await User.findOne(user.userId);

    const foundFriendship = await Friendship.findOne({
      where: [
        {
          sendTo: { id: root.id },
          sender: { id: currentUser?.profileId },
          status: 2,
        },
        {
          sender: { id: root.id },
          sendTo: { id: currentUser?.profileId },
          status: 2,
        },
      ],
    });
    if (foundFriendship) return true;
    return false;
  }

  @FieldResolver((_return) => Boolean)
  @UseMiddleware(checkAuth)
  async isFriendRequest(@Root() root: Profile, @Ctx() { user }: Context) {
    const currentUser = await User.findOne(user.userId);

    const foundFriendship = await Friendship.findOne({
      where: {
        sendTo: {
          id: currentUser?.profileId,
        },
        sender: {
          id: root.id,
        },
        status: 1,
      },
    });
    if (foundFriendship) return true;
    return false;
  }

  @FieldResolver((_return) => Boolean)
  @UseMiddleware(checkAuth)
  async isFriendSending(@Root() root: Profile, @Ctx() { user }: Context) {
    const currentUser = await User.findOne(user.userId);

    const foundFriendship = await Friendship.findOne({
      where: {
        sendTo: {
          id: root.id,
        },
        sender: {
          id: currentUser?.profileId,
        },
        status: 1,
      },
    });
    if (foundFriendship) return true;
    return false;
  }

  @FieldResolver()
  async followers(@Root() profile: Profile) {
    return await Following.find({
      where: {
        followedTo: { id: profile.id },
        follower: { id: Not(profile.id) },
      },
    });
  }

  @FieldResolver()
  async friends(@Root() profile: Profile) {
    return await Friendship.count({
      where: [
        { sendTo: { id: profile.id }, status: 2 },
        { sender: { id: profile.id }, status: 2 },
      ],
    });
  }

  @FieldResolver()
  async friend(@Root() profile: Profile) {
    return await Friendship.count({
      where: [
        { sendTo: { id: profile.id }, status: 2 },
        { sender: { id: profile.id }, status: 2 },
      ],
    });
  }

  @FieldResolver()
  async follower(@Root() profile: Profile) {
    return await Following.count({
      where: {
        followedTo: { id: profile.id },
        follower: { id: Not(profile.id) },
      },
    });
  }

  @FieldResolver()
  async following(@Root() profile: Profile) {
    return await Following.count({
      where: {
        follower: { id: profile.id },
        followedTo: { id: Not(profile.id) },
      },
    });
  }

  @Query((_return) => Profile, { nullable: true })
  async getProfile(
    @Arg("id", (_type) => ID) id: string
  ): Promise<Profile | undefined> {
    try {
      const foundProfile = await Profile.findOne(id);
      return foundProfile;
    } catch (error) {
      console.log(error);
      return undefined;
    }
  }

  @Query((_return) => Profiles, { nullable: true })
  @UseMiddleware(checkAuth)
  async getProfiles(
    @Arg("limit", (_type) => Int!, { nullable: true }) limit: number,
    @Arg("offset", (_type) => Int!, { nullable: true }) offset: number,
    @Arg("ordering", (_type) => String!, { nullable: true }) ordering: string,
    @Arg("search", (_type) => String!, { nullable: true }) search: string,
    @Ctx() { user }: Context
  ): Promise<Profiles | null> {
    try {
      const realLimit = Math.min(50, limit);
      const realOffset = offset || 0;

      const orderingField = ordering || "updatedAt";
      let searchOption = {};
      if (search) searchOption = { displayName: search ? ILike(search) : null };

      const findOptions: FindManyOptions<Profile> = {
        order: {
          [orderingField]: ordering?.startsWith("-") ? "DESC" : "ASC",
        },
        take: realLimit,
        skip: realOffset,
        where: {
          id: Not(user.profileId),
          ...searchOption,
        },
        relations: ["user"],
      };

      const totalProfileCount = await Profile.count(findOptions);

      const profiles = await Profile.find(findOptions);

      let hasMore = realLimit + realOffset < totalProfileCount;
      return {
        totalCount: totalProfileCount,
        hasMore,
        results: profiles,
      };
    } catch (error) {
      console.log(error);
      return null;
    }
  }

  @Mutation((_return) => ProfileMutationResponse)
  @UseMiddleware(checkAuth)
  async updateProfile(
    @Arg("updateProfileInput")
    { avatarFile, coverFile, ...args }: UpdateProfileInput,
    @Ctx() { user }: Context
  ): Promise<ProfileMutationResponse> {
    const existingUser = await User.findOne(user.userId);

    const existingProfile = await Profile.findOne(existingUser?.profileId);

    if (!existingProfile)
      return {
        code: 400,
        success: false,
        message: "Profile not found",
      };
    const uploader = new S3Service();

    if (avatarFile) {
      try {
        const avatarRes: any = await uploader.uploadFile(avatarFile);
        existingProfile.avatar = avatarRes.Location;
      } catch (error) {
        return {
          code: 400,
          success: false,
          message: error,
        };
      }
    }

    if (coverFile) {
      try {
        const coverRes: any = await uploader.uploadFile(coverFile);
        existingProfile.cover = coverRes.Location;
      } catch (error) {
        return {
          code: 400,
          success: false,
          message: error,
        };
      }
    }

    existingProfile.about = args.about;
    existingProfile.displayName = args.displayName;
    existingProfile.gender = args.gender;
    existingProfile.country = args.country;
    existingProfile.role = args.role;
    existingProfile.company = args.company;
    existingProfile.position = args.position;
    existingProfile.phoneNumber = args.phoneNumber;
    existingProfile.facebookLink = args.facebookLink;
    existingProfile.instagramLink = args.instagramLink;
    existingProfile.twitterLink = args.twitterLink;
    existingProfile.portfolioLink = args.portfolioLink;
    existingProfile.school = args.school;

    await existingProfile.save();
    return {
      code: 200,
      success: true,
      message: "Profile updated successfully",
      profile: existingProfile,
    };
  }
}
