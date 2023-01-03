import {
  Arg,
  Ctx,
  ID,
  Mutation,
  Query,
  Resolver,
  UseMiddleware,
} from "type-graphql";
import { Rating } from "../entities/Rating";
import { RatingCandidate } from "../entities/RatingCandidate";
import { RatingVote } from "../entities/RatingVote";
import { User } from "../entities/User";
import { checkAuth } from "../middleware/checkAuth";
import { Context } from "../types/Context";
import { RatingMutationResponse, RatingVotes } from "../types/Rating";

@Resolver(RatingVote)
export class RatingVoteResolver {
  @Mutation((_return) => RatingMutationResponse)
  @UseMiddleware(checkAuth)
  async voteCandidate(
    @Arg("ratingId", (_type) => ID!) ratingId: string,
    @Arg("candidateId", (_type) => ID!) candidateId: string,
    @Ctx() { user }: Context
  ): Promise<RatingMutationResponse> {
    try {
      const foundRating = await Rating.findOne(ratingId);
      if (!foundRating)
        return {
          code: 400,
          success: false,
          message: "Rating not found",
        };

      const foundCandidate = await RatingCandidate.findOne(candidateId);
      if (!foundCandidate)
        return {
          code: 400,
          success: false,
          message: "Wrong candidate",
        };

      const foundVote = await RatingVote.findOne({
        where: {
          ratingId: ratingId,
          voterId: user.userId,
        },
      });
      if (foundVote) {
        foundVote.votedFor = foundCandidate;
        await foundVote.save();
        return {
          code: 200,
          success: true,
          message: "Voted successfully",
        };
      } else {
        const foundUser = await User.findOne(user.userId);
        const newVote = RatingVote.create({
          voter: foundUser,
          rating: foundRating,
          votedFor: foundCandidate,
        });

        await newVote.save();

        return {
          code: 200,
          success: true,
          message: "Voted successfully",
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

  @Query((_return) => RatingVotes, { nullable: true })
  @UseMiddleware(checkAuth)
  async getRatingVotes(
    @Arg("candidateId", (_type) => ID!, { nullable: true }) candidateId: number
  ): Promise<RatingVotes | null> {
    try {
      const votes = await RatingVote.find({
        where: {
          votedForId: candidateId,
        },
        relations: ["voter"],
      });

      return {
        totalCount: votes.length,
        hasMore: false,
        results: votes,
      };
    } catch (error) {
      console.log(error);
      return null;
    }
  }
}
