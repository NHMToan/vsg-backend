import { ClubEvent } from "../entities/ClubEvent";
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
import { Any, FindManyOptions } from "typeorm";
import { CLUB_CREATE_KEY } from "../constants";
import { Club } from "../entities/Club";
import { ClubMember } from "../entities/ClubMember";
import { Profile } from "../entities/Profile";
import { checkAuth } from "../middleware/checkAuth";
import { S3Service } from "../services/uploader";
import {
  ClubMutationResponse,
  Clubs,
  CreateClubInput,
  UpdateClubInput,
} from "../types/Club";
import { Context } from "../types/Context";
import { PostMutationResponse } from "../types/Post/PostMutationResponse";
import { Vote } from "../entities/Vote";

@Resolver(Club)
export class ClubResolver {
  @FieldResolver((_return) => Number)
  @UseMiddleware(checkAuth)
  async memberCount(@Root() root: Club) {
    const count = await ClubMember.count({
      where: {
        clubId: root.id,
        status: 2,
      },
    });

    return count || 0;
  }
  @FieldResolver((_return) => Boolean)
  @UseMiddleware(checkAuth)
  async isRequesting(@Root() root: Club, @Ctx() { user }: Context) {
    if (root.adminId === user.profileId) return false;

    const foundMember = await ClubMember.findOne({
      where: {
        clubId: root.id,
        profileId: user.profileId,
        status: 1,
      },
    });
    if (foundMember) return true;
    return false;
  }

  @FieldResolver((_return) => Boolean)
  @UseMiddleware(checkAuth)
  async isMember(@Root() root: Club, @Ctx() { user }: Context) {
    if (root.adminId === user.profileId) return true;

    const foundMember = await ClubMember.findOne({
      where: {
        clubId: root.id,
        profileId: user.profileId,
        status: 2,
      },
    });
    if (foundMember) return true;
    return false;
  }

  @FieldResolver((_return) => Boolean)
  @UseMiddleware(checkAuth)
  async isSubAdmin(@Root() root: Club, @Ctx() { user }: Context) {
    if (root.adminId === user.profileId) return true;

    const foundMember = await ClubMember.findOne({
      where: {
        clubId: root.id,
        profileId: user.profileId,
        status: 2,
        role: 2,
      },
    });
    if (foundMember) return true;
    return false;
  }

  @FieldResolver((_return) => Boolean)
  @UseMiddleware(checkAuth)
  async isAdmin(@Root() root: Club, @Ctx() { user }: Context) {
    if (root.adminId === user.profileId) return true;
    return false;
  }

  @FieldResolver((_return) => Profile)
  async admin(@Root() root: Club) {
    return await Profile.findOne(root.adminId);
  }

  @Mutation((_return) => ClubMutationResponse)
  @UseMiddleware(checkAuth)
  async createClub(
    @Arg("createClubInput")
    { title, description, coverFile, publish, key }: CreateClubInput,
    @Ctx() { user }: Context
  ): Promise<ClubMutationResponse> {
    try {
      if (key !== CLUB_CREATE_KEY) {
        return {
          code: 400,
          success: false,
          message: "Wrong key",
        };
      }
      const existingProfile = await Profile.findOne(user.profileId);

      const uploader = new S3Service();
      let cover;

      if (coverFile) {
        try {
          const avatarRes: any = await uploader.uploadFile(coverFile);
          cover = avatarRes.Location;
        } catch (error) {
          return {
            code: 400,
            success: false,
            message: error,
          };
        }
      }

      const newClub = Club.create({
        title,
        description,
        admin: existingProfile,
        cover,
        publish: publish,
      });

      await newClub.save();

      const clubMem = ClubMember.create({
        profile: existingProfile,
        club: newClub,
        status: 2,
        role: 2,
      });

      await clubMem.save();

      return {
        code: 200,
        success: true,
        message: "Club created successfully",
        club: newClub,
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

  @Query((_return) => Clubs, { nullable: true })
  @UseMiddleware(checkAuth)
  async clubs(
    @Arg("limit", (_type) => Int!, { nullable: true }) limit: number,
    @Arg("offset", (_type) => Int!, { nullable: true }) offset: number,
    @Arg("ordering", (_type) => String!, { nullable: true }) ordering: string
  ): Promise<Clubs | null> {
    try {
      const totalPostCount = await Club.count();
      const realLimit = Math.min(50, limit);
      const realOffset = offset || 0;

      const orderingField = ordering || "createdAt";

      const findOptions: FindManyOptions<Club> = {
        order: {
          [orderingField]: ordering?.startsWith("-") ? "DESC" : "ASC",
        },
        take: realLimit,
        skip: realOffset,
      };

      const clubs = await Club.find(findOptions);

      let hasMore = realLimit + realOffset < totalPostCount;
      return {
        totalCount: totalPostCount,
        hasMore,
        results: clubs,
      };
    } catch (error) {
      console.log(error);
      return null;
    }
  }

  @Query((_return) => Club, { nullable: true })
  @UseMiddleware(checkAuth)
  async club(@Arg("id", (_type) => ID) id: string): Promise<Club | undefined> {
    try {
      const club = await Club.findOne(id);
      return club;
    } catch (error) {
      console.log(error);
      return undefined;
    }
  }

  @Mutation((_return) => ClubMutationResponse)
  @UseMiddleware(checkAuth)
  async updateClub(
    @Arg("id") id: string,
    @Arg("updateClubInput")
    { title, description, coverFile, publish }: UpdateClubInput,
    @Ctx() { user }: Context
  ): Promise<ClubMutationResponse> {
    const existingClub = await Club.findOne(id);
    if (!existingClub)
      return {
        code: 400,
        success: false,
        message: "Post not found",
      };

    if (existingClub?.adminId !== user.profileId) {
      return { code: 401, success: false, message: "Unauthorised" };
    }
    let cover = existingClub.cover;

    const uploader = new S3Service();
    if (coverFile) {
      try {
        const avatarRes: any = await uploader.uploadFile(coverFile);
        cover = avatarRes.Location;
      } catch (error) {
        return {
          code: 400,
          success: false,
          message: error,
        };
      }
    }

    existingClub.title = title;
    existingClub.description = description;
    existingClub.publish = publish;
    existingClub.cover = cover;

    await existingClub.save();

    return {
      code: 200,
      success: true,
      message: "Club updated successfully",
      club: existingClub,
    };
  }

  @Mutation((_return) => ClubMutationResponse)
  @UseMiddleware(checkAuth)
  async requestJoinClub(
    @Arg("id", (_type) => ID) id: string,
    @Ctx() { user }: Context
  ): Promise<PostMutationResponse> {
    const existingUser = await Profile.findOne(user.profileId);

    if (!existingUser)
      return {
        code: 400,
        success: false,
        message: "User unauthenticated",
      };

    const existingClub = await Club.findOne(id);
    if (!existingClub)
      return {
        code: 400,
        success: false,
        message: "Club not found",
      };

    const foundRequest = await ClubMember.findOne({
      where: {
        club: existingClub,
        profile: existingUser,
      },
      relations: ["club", "profile"],
    });
    if (foundRequest) {
      return {
        code: 400,
        success: false,
        message: "Request has been already sent",
      };
    }

    const newRequest = ClubMember.create({
      profile: existingUser,
      club: existingClub,
      status: 1,
    });

    await newRequest.save();

    return { code: 200, success: true, message: "Request sent!" };
  }

  @Mutation((_return) => ClubMutationResponse)
  @UseMiddleware(checkAuth)
  async acceptJoin(
    @Arg("id", (_type) => ID) id: string,
    @Ctx() { user }: Context
  ): Promise<PostMutationResponse> {
    const existingClubMember = await ClubMember.findOne(id);

    if (!existingClubMember)
      return {
        code: 400,
        success: false,
        message: "Request not found",
      };

    const existingClub = await Club.findOne(existingClubMember?.clubId);
    const hasAuth = await ClubMember.findOne({
      where: {
        profileId: user.profileId,
        clubId: existingClubMember?.clubId,
        status: 2,
        role: 2,
      },
    });

    if (!hasAuth && user.profileId !== existingClub?.adminId) {
      return {
        code: 400,
        success: false,
        message: "User unauthenticated",
      };
    }

    existingClubMember.status = 2;
    existingClubMember.role = 1;

    await existingClubMember.save();

    return { code: 200, success: true, message: "Accept!" };
  }

  @Mutation((_return) => ClubMutationResponse)
  @UseMiddleware(checkAuth)
  async setRole(
    @Arg("id", (_type) => ID) id: string,
    @Arg("role", (_type) => Int) role: number,
    @Ctx() { user }: Context
  ): Promise<PostMutationResponse> {
    const existingClubMember = await ClubMember.findOne(id);

    if (!existingClubMember)
      return {
        code: 400,
        success: false,
        message: "Request not found",
      };

    const existingClub = await Club.findOne(existingClubMember.clubId);

    if (user.profileId !== existingClub?.adminId) {
      return {
        code: 400,
        success: false,
        message: "User unauthenticated",
      };
    }
    existingClubMember.status = 2;
    existingClubMember.role = role;

    await existingClubMember.save();

    return { code: 200, success: true, message: "Set user role successfully!" };
  }

  @Mutation((_return) => ClubMutationResponse)
  @UseMiddleware(checkAuth)
  async deleteClubMember(
    @Arg("id", (_type) => ID) id: string
  ): Promise<PostMutationResponse> {
    const existingClubmember = await ClubMember.findOne(id);
    if (!existingClubmember)
      return {
        code: 400,
        success: false,
        message: "Clubmember not found",
      };

    await ClubMember.delete({ id });

    return {
      code: 200,
      success: true,
      message: "Club member deleted successfully",
    };
  }

  @Mutation((_return) => ClubMutationResponse)
  @UseMiddleware(checkAuth)
  async cancelRequestClub(
    @Arg("clubId", (_type) => ID) clubId: string,
    @Ctx() { user }: Context
  ): Promise<PostMutationResponse> {
    const existingClubmember = await ClubMember.findOne({
      where: {
        profileId: user.profileId,
        clubId,
      },
    });
    if (!existingClubmember)
      return {
        code: 400,
        success: false,
        message: "Clubmember not found",
      };

    await ClubMember.delete({ id: existingClubmember.id });

    return {
      code: 200,
      success: true,
      message: "Club member deleted successfully",
    };
  }

  @Mutation((_return) => ClubMutationResponse)
  @UseMiddleware(checkAuth)
  async deleteClub(
    @Arg("id", (_type) => ID) id: string,
    @Ctx() { user }: Context
  ): Promise<PostMutationResponse> {
    const existingClub = await Club.findOne(id);
    if (!existingClub)
      return {
        code: 400,
        success: false,
        message: "Club not found",
      };

    if (existingClub.adminId !== user.profileId) {
      return {
        code: 401,
        success: false,
        message: "Unauthorised",
      };
    }
    const foundEvent = await ClubEvent.find();
    await Vote.delete({ event: Any(foundEvent) });

    await ClubEvent.delete({ club: existingClub });
    await ClubMember.delete({ club: existingClub });

    await Club.delete({ id });

    return { code: 200, success: true, message: "Club deleted successfully" };
  }
}
