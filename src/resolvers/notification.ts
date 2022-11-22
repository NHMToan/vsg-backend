import {
  Arg,
  Args,
  Ctx,
  FieldResolver,
  Int,
  Mutation,
  Query,
  Resolver,
  ResolverFilterData,
  Root,
  Subscription,
  UseMiddleware,
} from "type-graphql";
import { FindManyOptions } from "typeorm";
import { Topic } from "../constants";
import { Notification } from "../entities/Notification";
import { Profile } from "../entities/Profile";
import { UserNotification } from "../entities/UserNotification";
import { checkAuth } from "../middleware/checkAuth";

import { Context } from "../types/Context";
import {
  NewNotiArgs,
  NewNotiPayload,
  NewNotiSubscriptionData,
  Notifications,
} from "../types/Notification";

@Resolver(UserNotification)
export class NotificationResolver {
  @FieldResolver((_return) => Notification)
  async notification(@Root() root: UserNotification) {
    return await Notification.findOne(root.notificationId);
  }
  @FieldResolver((_return) => Profile)
  async profile(@Root() root: UserNotification) {
    return await Profile.findOne(root.profileId);
  }

  @Query((_return) => Number, { nullable: true })
  @UseMiddleware(checkAuth)
  async getUnreadCount(@Ctx() { user }: Context): Promise<Number | null> {
    try {
      const profile = await Profile.findOne(user.profileId);
      if (!profile) return null;

      const findOptions: FindManyOptions<UserNotification> = {
        where: {
          is_read: false,
          profile,
        },
      };
      const totalCount = await UserNotification.count(findOptions);
      return totalCount || 0;
    } catch (error) {
      console.log(error);
      return null;
    }
  }

  @Query((_return) => Notifications, { nullable: true })
  @UseMiddleware(checkAuth)
  async getNotifications(
    @Arg("limit", (_type) => Int!, { nullable: true }) limit: number,
    @Arg("offset", (_type) => Int!, { nullable: true }) offset: number,
    @Ctx() { user }: Context
  ): Promise<Notifications | null> {
    try {
      const profile = await Profile.findOne(user.profileId);
      if (!profile)
        return {
          totalCount: 0,
          results: [],
        };

      const realLimit = limit || 50;
      const realOffset = offset || 0;
      const totalCount = await UserNotification.count({ where: { profile } });
      const findOptions: FindManyOptions<UserNotification> = {
        order: {
          createdAt: "DESC",
        },
        where: {
          profile,
        },
        take: realLimit,
        skip: realOffset,
        relations: ["notification", "profile"],
      };
      const notes = await UserNotification.find(findOptions);

      return {
        totalCount: totalCount,
        results: notes,
      };
    } catch (error) {
      console.log(error);
      return null;
    }
  }

  @Mutation((_return) => Boolean)
  @UseMiddleware(checkAuth)
  async readAllNotis(@Ctx() { user }: Context): Promise<Boolean> {
    try {
      const profile = await Profile.findOne(user.profileId);
      if (!profile) return false;
      const unreadNotis = await UserNotification.find({
        where: {
          profile,
          is_read: false,
        },
      });

      for (let i = 0; i < unreadNotis.length; i++) {
        unreadNotis[i].is_read = true;
        await unreadNotis[i].save();
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  @Subscription((_returns) => NewNotiSubscriptionData, {
    topics: Topic.NewNotification,
    filter: ({
      payload,
      args,
    }: ResolverFilterData<NewNotiPayload, NewNotiArgs>) => {
      return payload.profileId === args.profileId;
    },
  })
  newNotification(
    @Root() newNoti: NewNotiPayload,
    @Args() { profileId }: NewNotiArgs
  ): NewNotiSubscriptionData {
    return {
      profileId,
      notification: newNoti.notification,
    };
  }
}
