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
import { FindManyOptions, ILike } from "typeorm";
import { Friendship } from "../entities/Friendship";
import { Profile } from "../entities/Profile";
import { User } from "../entities/User";
import { checkAuth } from "../middleware/checkAuth";
import { Context } from "../types/Context";
import { FriendMutaionResponse } from "../types/Friend/FriendMutaionResponse";
import { Profiles } from "../types/Post/Profiles";
@Resolver((_) => Friendship)
export class FriendResolver {
  @FieldResolver((_return) => Profile)
  async sender(@Root() root: Friendship) {
    return await Profile.findOne(root.senderId);
  }

  @Mutation((_returns) => FriendMutaionResponse)
  @UseMiddleware(checkAuth)
  async addFriend(
    @Arg("toId", (_type) => ID) toId: string,
    @Ctx() { user }: Context
  ): Promise<FriendMutaionResponse> {
    const currentUser = await User.findOne(user.userId, {
      select: ["profileId"],
    });
    if (!currentUser) {
      return {
        code: 400,
        success: false,
        message: "Unathenticated",
      };
    }

    const sender = await Profile.findOne(currentUser?.profileId);
    const sendTo = await Profile.findOne(toId);

    if (!sender) {
      return {
        code: 400,
        success: false,
        message: "Unathenticated",
      };
    }
    if (!sendTo) {
      return {
        code: 400,
        success: false,
        message: "User is not existing",
      };
    }
    const foundFriendship = await Friendship.findOne({
      where: {
        sendTo: {
          id: currentUser.profileId,
        },
        sender: {
          id: toId,
        },
      },
    });
    if (foundFriendship) {
      foundFriendship.status = 2;
      foundFriendship.save();

      return {
        code: 200,
        success: true,
        message: "AddFriend",
        friendship: foundFriendship,
      };
    }
    const createFriendRequest = Friendship.create({
      sender,
      sendTo,
      status: 1,
    });

    await createFriendRequest.save();

    return {
      code: 200,
      success: true,
      message: "Friend request send",
      friendship: createFriendRequest,
    };
  }

  @Query((_return) => Profiles, { nullable: true })
  async getFriends(
    @Arg("profileId", (_type) => String) profileId: string,
    @Arg("limit", (_type) => Int!, { nullable: true }) limit: number,
    @Arg("offset", (_type) => Int!, { nullable: true }) offset: number,
    @Arg("search", (_type) => String!, { nullable: true }) search: string
  ): Promise<Profiles | null> {
    try {
      const totalCount = await Friendship.count({
        where: [
          {
            sender: {
              id: profileId,
            },
            status: 2,
          },
          {
            sendTo: {
              id: profileId,
            },
            status: 2,
          },
        ],
      });
      const realLimit = limit || 50;
      const realOffset = offset || 0;

      let searchOption = {};
      if (search)
        searchOption = { displayName: search ? ILike(`%${search}%`) : null };

      const findOptions: FindManyOptions<Friendship> = {
        order: {
          createdAt: "DESC",
        },
        take: realLimit,
        skip: realOffset,
        where: [
          {
            sender: {
              id: profileId,
            },
            sendTo: {
              ...searchOption,
            },
            status: 2,
          },
          {
            sendTo: {
              id: profileId,
            },
            sender: {
              ...searchOption,
            },
            status: 2,
          },
        ],
        relations: ["sender", "sendTo"],
      };

      const friendShips = await Friendship.find(findOptions);

      let hasMore = realLimit + realOffset < totalCount;

      return {
        totalCount: totalCount,
        hasMore,
        results: friendShips.map((item) => {
          if (item.sendTo.id === profileId) return item.sender;
          return item.sendTo;
        }),
      };
    } catch (error) {
      console.log(error);
      return null;
    }
  }

  @Mutation((_returns) => FriendMutaionResponse)
  @UseMiddleware(checkAuth)
  async deleteFriendShip(
    @Arg("toId", (_type) => ID) toId: string,
    @Ctx() { user }: Context
  ): Promise<FriendMutaionResponse> {
    const currentUser = await User.findOne(user.userId, {
      select: ["profileId"],
    });

    if (!currentUser) {
      return {
        code: 400,
        success: false,
        message: "Unathenticated",
      };
    }
    const foundFriendShip1 = await Friendship.findOne({
      where: {
        sender: { id: toId },
        sendTo: { id: currentUser?.profileId },
      },
    });
    const foundFriendShip2 = await Friendship.findOne({
      where: {
        sender: { id: currentUser?.profileId },
        sendTo: { id: toId },
      },
    });
    if (foundFriendShip1) {
      await Friendship.delete(foundFriendShip1.id);
    }
    if (foundFriendShip2) {
      await Friendship.delete(foundFriendShip2.id);
    }
    return {
      code: 200,
      success: true,
      message: "UnFriend",
    };
  }
}
