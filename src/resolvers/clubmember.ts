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
import { FindManyOptions, Like } from "typeorm";
import { Club } from "../entities/Club";
import { ClubMember } from "../entities/ClubMember";
import { Profile } from "../entities/Profile";
import { checkAuth } from "../middleware/checkAuth";
import { ClubMemberMutationResponse, Clubmembers } from "../types/Club";
import { Context } from "../types/Context";

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
  async isAdmin(@Root() root: ClubMember) {
    const existingClub = await Club.findOne(root.clubId);

    if (existingClub?.adminId === root.profileId) return true;
    return false;
  }

  @Query((_return) => Clubmembers, { nullable: true })
  @UseMiddleware(checkAuth)
  async clubmembers(
    @Arg("limit", (_type) => Int!, { nullable: true }) limit: number,
    @Arg("offset", (_type) => Int!, { nullable: true }) offset: number,
    @Arg("clubId", (_type) => ID!) clubId: string,
    @Arg("status", (_type) => Int!) status: number,
    @Arg("role", (_type) => Int!, { nullable: true }) role: number,
    @Arg("searchName", (_type) => String!, { nullable: true })
    searchName: string,
    @Arg("ordering", (_type) => String!, { nullable: true }) ordering: string
  ): Promise<Clubmembers | null> {
    try {
      const options: any = {
        clubId: clubId,
        status,
      };
      if (role) {
        options.role = role;
      }
      if (searchName) {
        options["profile.displayName"] = Like(`%${searchName}%`);
      }
      const totalPostCount = await ClubMember.count({
        where: options,
        relations: ["profile"],
      });

      const orderingField = ordering?.replace(/-/g, "") || "createdAt";

      const realLimit = limit || 50;
      const realOffset = offset || 0;

      const findOptions: FindManyOptions<ClubMember> = {
        take: realLimit,
        skip: realOffset,
        where: options,
        relations: ["profile"],
        order: {
          [orderingField]: ordering?.startsWith("-") ? "DESC" : "ASC",
        },
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

  @Mutation((_return) => ClubMemberMutationResponse)
  @UseMiddleware(checkAuth)
  async setIsAdvanced(
    @Arg("memberId", (_type) => ID) id: string,
    @Arg("isAdvanced", (_type) => Boolean) isAdvanced: boolean,
    @Ctx() { user }: Context
  ): Promise<ClubMemberMutationResponse> {
    const existingClubMember = await ClubMember.findOne(id);

    if (!existingClubMember)
      return {
        code: 400,
        success: false,
        message: "Clubmember not found",
      };

    const existingClub = await Club.findOne(existingClubMember.clubId);
    if (!existingClub) {
      return {
        code: 400,
        success: false,
        message: "Club not found",
      };
    }
    if (user.profileId !== existingClub.adminId) {
      return {
        code: 400,
        success: false,
        message: "User unauthenticated",
      };
    }
    existingClubMember.isAdvanced = isAdvanced;

    await existingClubMember.save();

    return {
      code: 200,
      clubMember: existingClubMember,
      success: true,
      message: "Clubmember status is changed successfully!",
    };
  }
}
