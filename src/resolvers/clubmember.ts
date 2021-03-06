import { Context } from "../types/Context";
import {
  Arg,
  Ctx,
  FieldResolver,
  ID,
  Int,
  Query,
  Resolver,
  Root,
  UseMiddleware,
} from "type-graphql";
import { FindManyOptions } from "typeorm";
import { Club } from "../entities/Club";
import { ClubMember } from "../entities/ClubMember";
import { Profile } from "../entities/Profile";
import { checkAuth } from "../middleware/checkAuth";
import { Clubmembers } from "../types/Club";

@Resolver(ClubMember)
export class ClubMemberResolver {
  @FieldResolver((_return) => Profile)
  async profile(@Root() root: ClubMember) {
    return await Profile.findOne(root.profileId);
  }

  @FieldResolver((_return) => Club)
  async club(@Root() root: ClubMember) {
    return await Club.findOne(root.clubId);
  }

  @FieldResolver((_return) => Boolean)
  @UseMiddleware(checkAuth)
  async isAdmin(@Root() root: ClubMember, @Ctx() { user }: Context) {
    if (root.profileId === user.profileId) return true;
    return false;
  }

  @Query((_return) => Clubmembers, { nullable: true })
  @UseMiddleware(checkAuth)
  async clubmembers(
    @Arg("limit", (_type) => Int!, { nullable: true }) limit: number,
    @Arg("offset", (_type) => Int!, { nullable: true }) offset: number,
    @Arg("clubId", (_type) => ID!) clubId: string,
    @Arg("status", (_type) => Int!) status: number,
    @Arg("role", (_type) => Int!, { nullable: true }) role: number
  ): Promise<Clubmembers | null> {
    try {
      const options: any = {
        clubId: clubId,
        status,
      };
      if (role) {
        options.role = role;
      }
      const totalPostCount = await ClubMember.count({
        where: options,
      });
      const realLimit = limit || 50;
      const realOffset = offset || 0;

      const findOptions: FindManyOptions<ClubMember> = {
        take: realLimit,
        skip: realOffset,
        where: options,
      };

      const clubmems = await ClubMember.find(findOptions);

      let hasMore = realLimit + realOffset < totalPostCount;
      return {
        totalCount: totalPostCount,
        hasMore,
        results: clubmems,
      };
    } catch (error) {
      console.log(error);
      return null;
    }
  }
}
