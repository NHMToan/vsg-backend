import {
  Arg,
  FieldResolver,
  ID,
  Mutation,
  Query,
  Resolver,
  Root,
  UseMiddleware,
} from "type-graphql";
import { Rating } from "../entities/Rating";
import { RatingCandidate } from "../entities/RatingCandidate";
import { RatingVote } from "../entities/RatingVote";
import { checkAuth } from "../middleware/checkAuth";
import { S3Service } from "../services/uploader";
import {
  Candidates,
  CreateRatingCandidateInput,
  RatingMutationResponse,
} from "../types/Rating";

@Resolver(RatingCandidate)
export class RatingCandidateResolver {
  @FieldResolver((_return) => Number, { nullable: true })
  @UseMiddleware(checkAuth)
  async votedCount(@Root() root: RatingCandidate) {
    const foundVote = await RatingVote.find({
      where: {
        votedForId: root.id,
      },
    });

    return foundVote?.length || 0;
  }

  @Query((_return) => Candidates, { nullable: true })
  @UseMiddleware(checkAuth)
  async getCandidates(
    @Arg("ratingId", (_type) => ID!) ratingId: string
  ): Promise<Candidates | null> {
    try {
      const foundCandidates = await RatingCandidate.find({
        where: {
          ratingId,
        },
      });

      return {
        totalCount: foundCandidates.length,
        results: foundCandidates,
        hasMore: false,
      };
    } catch (error) {
      console.log(error);
      return null;
    }
  }

  @Mutation((_return) => RatingMutationResponse)
  @UseMiddleware(checkAuth)
  async createCandidate(
    @Arg("ratingId", (_type) => ID!) ratingId: string,
    @Arg("createCandidateInput")
    { photo1, name, bio, video }: CreateRatingCandidateInput
  ): Promise<RatingMutationResponse> {
    try {
      const foundRating = await Rating.findOne(ratingId);
      if (!foundRating)
        return {
          code: 400,
          success: false,
          message: "Rating not found",
        };

      const uploader = new S3Service();
      let photo;

      if (photo1) {
        try {
          const avatarRes: any = await uploader.uploadFile(photo1);
          photo = avatarRes.Location;
        } catch (error) {
          return {
            code: 400,
            success: false,
            message: error,
          };
        }
      }

      const newCandidate = RatingCandidate.create({
        name,
        bio,
        photo1: photo,
        video: video,
        rating: foundRating,
      });

      await newCandidate.save();

      return {
        code: 200,
        success: true,
        message: "Candidate created successfully",
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

  @Mutation((_return) => RatingMutationResponse)
  @UseMiddleware(checkAuth)
  async updateCandidate(
    @Arg("id") id: string,
    @Arg("updateCandidateInput")
    { name, bio, photo1, video }: CreateRatingCandidateInput
  ): Promise<RatingMutationResponse> {
    const existingCandidate = await RatingCandidate.findOne(id);
    if (!existingCandidate)
      return {
        code: 400,
        success: false,
        message: "Candidate not found",
      };

    let cover = existingCandidate.photo1;

    const uploader = new S3Service();
    if (photo1) {
      try {
        const avatarRes: any = await uploader.uploadFile(photo1);
        cover = avatarRes.Location;
      } catch (error) {
        return {
          code: 400,
          success: false,
          message: error,
        };
      }
    }

    existingCandidate.name = name;
    existingCandidate.bio = bio;
    existingCandidate.video = video;
    existingCandidate.photo1 = cover;

    await existingCandidate.save();

    return {
      code: 200,
      success: true,
      message: "Candidate updated successfully",
    };
  }
  @Mutation((_return) => RatingMutationResponse)
  @UseMiddleware(checkAuth)
  async deleteCandidate(
    @Arg("id", (_type) => ID) id: string
  ): Promise<RatingMutationResponse> {
    const existingCandidate = await RatingCandidate.findOne(id);

    if (!existingCandidate)
      return {
        code: 400,
        success: false,
        message: "Candidate not found",
      };

    await RatingVote.delete({
      votedForId: id,
    });

    await RatingCandidate.delete({
      id,
    });

    return {
      code: 200,
      success: true,
      message: "Candidate deleted successfully",
    };
  }
}
