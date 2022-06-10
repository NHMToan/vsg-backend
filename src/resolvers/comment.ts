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
import { Comment } from "../entities/Comment";
import { User } from "../entities/user";
import { checkAuth } from "../middleware/checkAuth";
import { Context } from "../types/Context";
import { CommentMutationResponse } from "../types/Post/CommentMutationResponse";
import { Comments } from "../types/Post/Comments";

@Resolver((_) => Comment)
export class CommentResolver {
  @FieldResolver((_return) => User)
  async author(
    @Root() root: Comment,
    @Ctx() { dataLoaders: { userLoader } }: Context
  ) {
    return await userLoader.load(root.authorId);
  }

  @FieldResolver()
  async replyComments(@Root() comment: Comment) {
    return await Comment.find({
      where: { comment: { id: comment.id } },
      order: {
        createdAt: "DESC",
      },
    });
  }

  @Mutation((_return) => CommentMutationResponse)
  @UseMiddleware(checkAuth)
  async deleteComment(
    @Arg("id", (_type) => ID) id: string,
    @Ctx() { user }: Context
  ): Promise<CommentMutationResponse> {
    const existingComment = await Comment.findOne(id);
    if (!existingComment)
      return {
        code: 400,
        success: false,
        message: "Comment not found",
      };

    if (existingComment.authorId !== user.userId) {
      return {
        code: 401,
        success: false,
        message: "Unauthorised",
      };
    }

    await Comment.delete({ comment: existingComment });

    await Comment.delete({ id });

    return {
      code: 200,
      success: true,
      message: "Comment deleted successfully",
    };
  }

  @Query((_return) => Comments, { nullable: true })
  async comments(
    @Arg("limit", (_type) => Int!, { nullable: true }) limit: number,
    @Arg("offset", (_type) => Int!, { nullable: true }) offset: number,
    @Arg("ordering", (_type) => String!, { nullable: true }) ordering: string,
    @Arg("postId", (_type) => ID!) postId: string
  ): Promise<Comments | null> {
    try {
      const foundComments = await Comment.find({
        where: { post: { id: postId } },
      });
      const totalPostCount = foundComments.length;

      const realLimit = Math.min(50, limit);
      const realOffset = offset || 0;

      const orderingField = ordering || "-createdAt";

      const findOptions: FindManyOptions<Comment> = {
        order: {
          [orderingField.replace("-", "")]: orderingField.startsWith("-")
            ? "DESC"
            : "ASC",
        },
        take: realLimit,
        skip: realOffset,
        where: { post: { id: postId } },
      };

      const comments = await Comment.find(findOptions);

      let hasMore = realLimit + realOffset < totalPostCount;
      return {
        totalCount: totalPostCount,
        hasMore,
        results: comments,
      };
    } catch (error) {
      console.log(error);
      return null;
    }
  }
}
