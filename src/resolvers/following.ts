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
import { FindManyOptions, Not } from "typeorm";
import { Following } from "../entities/Following";
import { Profile } from "../entities/Profile";
import { User } from "../entities/User";
import { checkAuth } from "../middleware/checkAuth";
import { Context } from "../types/Context";
import { FollowingMutaionResponse } from "../types/Following/FollowingMutaionResponse";
import { Profiles } from "../types/Post/Profiles";
@Resolver((_) => Following)
export class FollowingResolver {
  @FieldResolver((_return) => Profile)
  async follower(@Root() root: Following) {
    return await Profile.findOne(root.followerId);
  }

  @FieldResolver((_return) => User)
  async followedTo(@Root() root: Following) {
    return await Profile.findOne(root.followedToId);
  }

  @Query((_return) => Profiles, { nullable: true })
  async getFollowers(
    @Arg("profileId", (_type) => String) profileId: string,
    @Arg("limit", (_type) => Int!, { nullable: true }) limit: number,
    @Arg("offset", (_type) => Int!, { nullable: true }) offset: number
  ): Promise<Profiles | null> {
    try {
      const totalPostCount = await Following.count({
        where: {
          followedTo: { id: profileId },
        },
      });
      const realLimit = limit || 50;
      const realOffset = offset || 0;

      const findOptions: FindManyOptions<Following> = {
        order: {
          follower: "DESC",
        },
        take: realLimit,
        skip: realOffset,
        where: {
          followedTo: { id: profileId },
          follower: { id: Not(profileId) },
        },
        relations: ["follower"],
      };

      const follows = await Following.find(findOptions);

      let hasMore = realLimit + realOffset < totalPostCount;

      return {
        totalCount: totalPostCount,
        hasMore,
        results: follows.map((item) => item.follower),
      };
    } catch (error) {
      console.log(error);
      return null;
    }
  }

  @Mutation((_returns) => FollowingMutaionResponse)
  @UseMiddleware(checkAuth)
  async follow(
    @Arg("followId", (_type) => ID) followId: string,
    @Ctx() { user }: Context
  ): Promise<FollowingMutaionResponse> {
    const currentUser = await User.findOne(user.userId);
    const follower = await Profile.findOne(currentUser?.profileId);
    const followedTo = await Profile.findOne(followId);

    const createFollowing = Following.create({
      follower,
      followedTo,
    });
    await createFollowing.save();
    return {
      code: 200,
      success: true,
      message: "Followed success",
    };
  }

  @Mutation((_returns) => FollowingMutaionResponse)
  @UseMiddleware(checkAuth)
  async unFollow(
    @Arg("followId", (_type) => ID) followId: string,
    @Ctx() { user }: Context
  ): Promise<FollowingMutaionResponse> {
    const currentUser = await User.findOne(user.userId);

    await Following.delete({
      followedTo: {
        id: followId,
      },
      follower: { id: currentUser?.profileId },
    });

    return {
      code: 200,
      success: true,
      message: "Unfollowed",
    };
  }
}
