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
import { FindManyOptions } from "typeorm";
import { Rating } from "../entities/Rating";
import { RatingCandidate } from "../entities/RatingCandidate";
import { RatingVote } from "../entities/RatingVote";
import { User } from "../entities/User";
import { checkAuth } from "../middleware/checkAuth";
import { Context } from "../types/Context";
import {
  CreateRatingInput,
  RatingMutationResponse,
  Ratings,
} from "../types/Rating";

@Resolver(Rating)
export class RatingResolver {
  @FieldResolver((_return) => RatingCandidate, { nullable: true })
  @UseMiddleware(checkAuth)
  async votedFor(@Root() root: Rating, @Ctx() { user }: Context) {
    const foundUser = await User.findOne(user.userId);

    const foundVote = await RatingVote.findOne({
      where: {
        voter: foundUser,
        rating: root,
      },
    });

    if (foundVote) {
      const foundCandidate = await RatingCandidate.findOne(
        foundVote.votedForId
      );
      return foundCandidate;
    }

    return null;
  }

  @Query((_return) => Ratings, { nullable: true })
  @UseMiddleware(checkAuth)
  async myRatings(): Promise<Ratings | null> {
    try {
      const foundRatings = await Rating.find({
        where: {
          status: 1,
        },
      });

      return {
        totalCount: foundRatings.length,
        results: foundRatings,
        hasMore: false,
      };
    } catch (error) {
      console.log(error);
      return null;
    }
  }

  @Query((_return) => Rating, { nullable: true })
  @UseMiddleware(checkAuth)
  async rating(
    @Arg("id", (_type) => ID) id: string
  ): Promise<Rating | undefined> {
    try {
      const club = await Rating.findOne(id);
      return club;
    } catch (error) {
      console.log(error);
      return undefined;
    }
  }

  @Query((_return) => Ratings, { nullable: true })
  @UseMiddleware(checkAuth)
  async ratings(
    @Arg("limit", (_type) => Int!, { nullable: true }) limit: number,
    @Arg("offset", (_type) => Int!, { nullable: true }) offset: number,
    @Arg("ordering", (_type) => String!, { nullable: true }) ordering: string
  ): Promise<Ratings | null> {
    try {
      const totalPostCount = await Rating.count();
      const realLimit = limit || 50;
      const realOffset = offset || 0;

      const orderingField = ordering || "createdAt";

      const findOptions: FindManyOptions<Rating> = {
        order: {
          [orderingField]: ordering?.startsWith("-") ? "DESC" : "ASC",
        },
        take: realLimit,
        skip: realOffset,
      };

      const ratings = await Rating.find(findOptions);

      let hasMore = realLimit + realOffset < totalPostCount;
      return {
        totalCount: totalPostCount,
        hasMore,
        results: ratings,
      };
    } catch (error) {
      console.log(error);
      return null;
    }
  }

  @Mutation((_return) => RatingMutationResponse)
  @UseMiddleware(checkAuth)
  async createRating(
    @Arg("createRatingInput")
    { ...args }: CreateRatingInput,
    @Ctx() { user }: Context
  ): Promise<RatingMutationResponse> {
    try {
      const { userId } = user;
      const findUser = await User.findOne(userId);

      if (!findUser || findUser.role !== "admin")
        return {
          code: 401,
          success: false,
          message: "Unauthenticated",
        };

      const newRating = Rating.create({
        ...args,
      });
      await newRating.save();

      return {
        code: 200,
        success: true,
        message: "Rating created successfully",
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
  async updateRating(
    @Arg("id", (_type) => ID) id: string,
    @Arg("updateRatingInput")
    { name, description, start, end }: CreateRatingInput
  ): Promise<RatingMutationResponse> {
    try {
      const foundRating = await Rating.findOne(id);
      if (!foundRating)
        return {
          code: 400,
          success: false,
          message: "Rating not found",
        };
      foundRating.name = name;
      foundRating.description = description;
      foundRating.start = start;
      foundRating.end = end;
      await foundRating.save();
      return {
        code: 200,
        success: true,
        message: "Rating updated successfully",
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
  async changeHiddenRating(
    @Arg("id", (_type) => ID) id: string,
    @Arg("hidden", (_type) => Boolean) hidden: boolean
  ): Promise<RatingMutationResponse> {
    try {
      const foundRating = await Rating.findOne(id);
      if (!foundRating)
        return {
          code: 400,
          success: false,
          message: "Rating not found",
        };
      foundRating.hidden = hidden;
      await foundRating.save();
      return {
        code: 200,
        success: true,
        message: "Rating updated successfully",
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
  async changeStatusRating(
    @Arg("id", (_type) => ID) id: string,
    @Arg("status", (_type) => Int) status: number
  ): Promise<RatingMutationResponse> {
    try {
      const foundRating = await Rating.findOne(id);
      if (!foundRating)
        return {
          code: 400,
          success: false,
          message: "Rating not found",
        };
      foundRating.status = status;
      await foundRating.save();
      return {
        code: 200,
        success: true,
        message: "Rating updated successfully",
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
  async deleteRating(
    @Arg("id", (_type) => ID) id: string,
    @Ctx() { user }: Context
  ): Promise<RatingMutationResponse> {
    const { userId } = user;
    const findUser = await User.findOne(userId);

    if (!findUser || findUser.role !== "admin")
      return {
        code: 401,
        success: false,
        message: "Unauthenticated",
      };

    const existingRating = await Rating.findOne(id);

    if (!existingRating)
      return {
        code: 400,
        success: false,
        message: "Rating not found",
      };

    await RatingVote.delete({
      rating: {
        id,
      },
    });

    await RatingCandidate.delete({
      rating: {
        id,
      },
    });

    await Rating.delete(id);

    return { code: 200, success: true, message: "Rating deleted successfully" };
  }
}
