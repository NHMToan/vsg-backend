import orderBy from "lodash/orderBy";
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
import { Club } from "../entities/Club";
import { ClubMember } from "../entities/ClubMember";
import { ClubNote } from "../entities/ClubNote";
import { checkAuth } from "../middleware/checkAuth";
import { S3Service } from "../services/uploader";
import {
  ClubNoteMutationResponse,
  ClubNotes,
  CreateClubNoteInput,
  UpdateClubNoteInput,
} from "../types/Club/note";
import { Context } from "../types/Context";

@Resolver(ClubNote)
export class ClubNoteResolver {
  @Mutation((_return) => ClubNoteMutationResponse)
  @UseMiddleware(checkAuth)
  async createClubNote(
    @Arg("createClubNoteInput")
    { clubId, images, ...args }: CreateClubNoteInput,
    @Ctx() { user }: Context
  ): Promise<ClubNoteMutationResponse> {
    try {
      const { profileId } = user;
      const club = await Club.findOne(clubId);
      const clubMem = await ClubMember.findOne({
        where: {
          clubId,
          profileId,
        },
      });

      if (!clubMem || clubMem.role !== 2)
        return {
          code: 401,
          success: false,
          message: "Unauthenticated",
        };
      const uploader = new S3Service();
      let imagesArray: string[] = [];
      if (images?.length > 0) {
        for (let i = 0; i < images.length; i++) {
          try {
            const imageRes: any = await uploader.uploadFile(images[i]);
            imagesArray.push(imageRes.Location);
          } catch (error) {
            return {
              code: 400,
              success: false,
              message: error,
            };
          }
        }
      }

      const newNote = ClubNote.create({
        ...args,
        images: imagesArray,
        club,
      });
      await newNote.save();

      return {
        code: 200,
        success: true,
        message: "Note created successfully",
        note: newNote,
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

  @Mutation((_return) => ClubNoteMutationResponse)
  @UseMiddleware(checkAuth)
  async updateClubNote(
    @Arg("id", (_type) => ID) id: string,
    @Arg("updateClubNoteInput")
    { description, isPublic }: UpdateClubNoteInput,
    @Ctx() { user }: Context
  ): Promise<ClubNoteMutationResponse> {
    const existingNote = await ClubNote.findOne(id);

    if (!existingNote)
      return {
        code: 400,
        success: false,
        message: "Note not found",
      };

    const foundMem = await ClubMember.findOne({
      where: {
        clubId: existingNote.clubId,
        profileId: user.profileId,
      },
    });

    if (!foundMem || foundMem.role === 1) {
      return { code: 401, success: false, message: "Unauthorised" };
    }

    existingNote.isPublic = isPublic;
    existingNote.description = description;

    await existingNote.save();

    return {
      code: 200,
      success: true,
      message: "Note updated successfully",
      note: existingNote,
    };
  }

  @Query((_return) => ClubNotes, { nullable: true })
  @UseMiddleware(checkAuth)
  async clubNotes(
    @Arg("clubId", (_type) => ID!) clubId: string,
    @Arg("limit", (_type) => Int!, { nullable: true }) limit: number,
    @Arg("offset", (_type) => Int!, { nullable: true }) offset: number,
    @Arg("ordering", (_type) => String!, { nullable: true }) ordering: string
  ): Promise<ClubNotes | null> {
    try {
      const totalNoteCount = await ClubNote.count({ where: { clubId } });
      const realLimit = limit || 50;
      const realOffset = offset || 0;

      const orderingField = ordering || "createdAt";

      const findOptions: FindManyOptions<ClubNote> = {
        order: {
          [orderingField]: ordering?.startsWith("-") ? "DESC" : "ASC",
        },
        take: realLimit,
        skip: realOffset,
        where: {
          clubId,
        },
        relations: ["club"],
      };

      const notes = await ClubNote.find(findOptions);

      let hasMore = realLimit + realOffset < totalNoteCount;
      return {
        totalCount: totalNoteCount,
        hasMore,
        results: notes,
      };
    } catch (error) {
      console.log(error);
      return null;
    }
  }

  @Query((_return) => ClubNotes, { nullable: true })
  @UseMiddleware(checkAuth)
  async myClubNotes(@Ctx() { user }: Context): Promise<ClubNotes | null> {
    try {
      const clubMems = await ClubMember.find({
        where: {
          profileId: user.profileId,
          status: 2,
        },
      });

      let foundNotes: ClubNote[] = [];

      for (let i = 0; i < clubMems.length; i++) {
        const clubNotes = await ClubNote.find({
          where: {
            club: {
              id: clubMems[i].clubId,
            },
            isPublic: true,
          },
          relations: ["club"],
        });
        foundNotes.push(...clubNotes);
      }

      return {
        totalCount: foundNotes.length,
        results: orderBy(foundNotes, ["time"], ["asc"]),
        hasMore: false,
      };
    } catch (error) {
      console.log(error);
      return null;
    }
  }

  @Mutation((_return) => ClubNoteMutationResponse)
  @UseMiddleware(checkAuth)
  async changeClubNoteStatus(
    @Arg("id", (_type) => ID) id: string,
    @Arg("isPublic", (_type) => Boolean) isPublic: boolean,
    @Ctx() { user }: Context
  ): Promise<ClubNoteMutationResponse> {
    const existingNote = await ClubNote.findOne(id);

    if (!existingNote)
      return {
        code: 400,
        success: false,
        message: "Note not found",
      };
    const foundClubMem = await ClubMember.findOne({
      where: {
        clubId: existingNote.clubId,
        profileId: user.profileId,
      },
    });
    if (!foundClubMem || foundClubMem.role === 1)
      return {
        code: 401,
        success: false,
        message: "Unauthorized",
      };

    existingNote.isPublic = isPublic;
    await existingNote.save();
    return {
      code: 200,
      success: true,
      message: "Note status has changed successfully",
      note: existingNote,
    };
  }

  @Mutation((_return) => ClubNoteMutationResponse)
  @UseMiddleware(checkAuth)
  async deleteClubNote(
    @Arg("id", (_type) => ID) id: string,
    @Ctx() { user }: Context
  ): Promise<ClubNoteMutationResponse> {
    const existingNote = await ClubNote.findOne(id);

    if (!existingNote)
      return {
        code: 400,
        success: false,
        message: "Note not found",
      };
    const foundClubMem = await ClubMember.findOne({
      where: {
        clubId: existingNote.clubId,
        profileId: user.profileId,
      },
    });
    if (!foundClubMem || foundClubMem.role === 1)
      return {
        code: 401,
        success: false,
        message: "Unauthorized",
      };

    await ClubNote.delete(id);

    return { code: 200, success: true, message: "Note deleted successfully" };
  }
}
