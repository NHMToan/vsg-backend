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
import { Post } from "../entities/Post";
import { User } from "../entities/User";
import { checkAuth } from "../middleware/checkAuth";
import { S3Service } from "../services/uploader";
import { Context } from "../types/Context";
import { MutationResponse } from "../types/MutationRes";
import { CommentInput } from "../types/Post/CommentInput";
import { CommentMutationResponse } from "../types/Post/CommentMutationResponse";
import { CreatePostInput } from "../types/Post/CreatePostInput";
import { PostMutationResponse } from "../types/Post/PostMutationResponse";
import { Posts } from "../types/Post/Posts";
import { ReplyCommentInput } from "../types/Post/ReplyCommentInput";
import { UpdatePostInput } from "../types/Post/UpdatePostInput";

@Resolver(Post)
export class PostResolver {
  @FieldResolver((_return) => String)
  textSnippet(@Root() root: Post) {
    return root.content.slice(0, 50);
  }

  @FieldResolver((_return) => User)
  async author(@Root() root: Post) {
    return await User.findOne(root.authorId);
  }
  @FieldResolver()
  async comments(@Root() post: Post) {
    return await Comment.find({
      where: { post: { id: post.id } },
    });
  }

  @FieldResolver((_return) => Number)
  async favorite(@Root() root: Post) {
    const favoritePerson = await root.favoritePerson;
    return favoritePerson.length;
  }

  @Mutation((_return) => PostMutationResponse)
  @UseMiddleware(checkAuth)
  async createPost(
    @Arg("createPostInput")
    {
      title,
      content,
      description,
      tags,
      coverFile,
      metaDescription,
      metaKeywords,
      metaTitle,
      publish,
      allowComments,
    }: CreatePostInput,
    @Ctx() { user }: Context
  ): Promise<PostMutationResponse> {
    try {
      const existingUser = await User.findOne(user.userId);

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

      const newPost = Post.create({
        title,
        content,
        description,
        author: existingUser,
        tags,
        metaDescription,
        metaKeywords,
        metaTitle,
        publish,
        allowComments,
        cover,
      });

      await newPost.save();

      return {
        code: 200,
        success: true,
        message: "Post created successfully",
        post: newPost,
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

  @Query((_return) => Posts, { nullable: true })
  async posts(
    @Arg("limit", (_type) => Int!, { nullable: true }) limit: number,
    @Arg("offset", (_type) => Int!, { nullable: true }) offset: number,
    @Arg("ordering", (_type) => String!, { nullable: true }) ordering: string
  ): Promise<Posts | null> {
    try {
      const totalPostCount = await Post.count();
      const realLimit = Math.min(50, limit);
      const realOffset = offset || 0;

      const orderingField = ordering || "createdAt";

      const findOptions: FindManyOptions<Post> = {
        order: {
          [orderingField]: ordering?.startsWith("-") ? "DESC" : "ASC",
        },
        take: realLimit,
        skip: realOffset,
      };

      const posts = await Post.find(findOptions);

      let hasMore = realLimit + realOffset < totalPostCount;
      return {
        totalCount: totalPostCount,
        hasMore,
        results: posts,
      };
    } catch (error) {
      console.log(error);
      return null;
    }
  }

  @Query((_return) => Post, { nullable: true })
  async post(@Arg("id", (_type) => ID) id: number): Promise<Post | undefined> {
    try {
      const post = await Post.findOne(id);
      return post;
    } catch (error) {
      console.log(error);
      return undefined;
    }
  }

  @Mutation((_return) => PostMutationResponse)
  @UseMiddleware(checkAuth)
  async updatePost(
    @Arg("id") id: string,
    @Arg("updatePostInput")
    {
      coverFile,
      title,
      content,
      description,
      tags,
      metaDescription,
      metaKeywords,
      metaTitle,
      publish,
      allowComments,
    }: UpdatePostInput,
    @Ctx() { user }: Context
  ): Promise<PostMutationResponse> {
    const existingPost = await Post.findOne(id);
    if (!existingPost)
      return {
        code: 400,
        success: false,
        message: "Post not found",
      };

    if (existingPost.authorId !== user.userId) {
      return { code: 401, success: false, message: "Unauthorised" };
    }
    let cover = existingPost.cover;

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

    existingPost.title = title;
    existingPost.description = description;
    existingPost.tags = tags;
    existingPost.metaDescription = metaDescription;
    existingPost.metaKeywords = metaKeywords;
    existingPost.metaTitle = metaTitle;
    existingPost.publish = publish;
    existingPost.content = content;
    existingPost.allowComments = allowComments;
    existingPost.cover = cover;

    await existingPost.save();

    return {
      code: 200,
      success: true,
      message: "Post updated successfully",
      post: existingPost,
    };
  }

  @Mutation((_returns) => MutationResponse)
  @UseMiddleware(checkAuth)
  async like(
    @Arg("postId", (_type) => ID) postId: string,
    @Ctx() { user }: Context
  ): Promise<MutationResponse> {
    // find the recipe
    const post = await Post.findOne(postId);

    const existingUser = await User.findOne(user.userId);

    if (!post) {
      return {
        code: 400,
        success: false,
        message: "Invalid post",
      };
    }

    if (!existingUser) {
      return {
        code: 400,
        success: false,
        message: "Invalid User",
      };
    }

    const favoritePerson = await post.favoritePerson;

    if (!Array.isArray(favoritePerson)) {
      post.favoritePerson = Promise.resolve([existingUser]);

      await post.save();
      return {
        code: 200,
        success: true,
        message: "Liked 1 successfully",
      };
    } else {
      if (favoritePerson.find((p) => p.id === user.userId)) {
        post.favoritePerson = Promise.resolve(
          favoritePerson.filter((p) => p.id !== user.userId)
        );

        await post.save();
        return {
          code: 200,
          success: true,
          message: "Unliked successfully",
        };
      } else {
        post.favoritePerson = Promise.resolve(
          favoritePerson.concat(existingUser)
        );

        await post.save();
        return {
          code: 200,
          success: true,
          message: "Liked 2 successfully",
        };
      }
    }
  }

  @Mutation((_returns) => CommentMutationResponse)
  @UseMiddleware(checkAuth)
  async commentPost(
    @Arg("commentInput") commentInput: CommentInput,
    @Ctx() { user }: Context
  ): Promise<CommentMutationResponse> {
    // find the recipe
    const post = await Post.findOne(commentInput.postId, {
      relations: ["comments"],
    });

    const existingUser = await User.findOne(user.userId);

    if (!post) {
      return {
        code: 400,
        success: false,
        message: "Invalid post",
      };
    }

    const newComment = Comment.create({
      post: post,
      content: commentInput.content,
      author: existingUser,
    });

    await newComment.save();

    post.comments.push(newComment);

    await post.save();

    return {
      code: 200,
      success: true,
      message: "Comment added successfully",
      comment: newComment,
    };
  }
  @Mutation((_returns) => CommentMutationResponse)
  @UseMiddleware(checkAuth)
  async replyComment(
    @Arg("replyCommentInput") replyCommentInput: ReplyCommentInput,
    @Ctx() { user }: Context
  ): Promise<CommentMutationResponse> {
    // find the recipe
    const existingComment = await Comment.findOne(replyCommentInput.commentId);

    const existingUser = await User.findOne(user.userId);

    if (!existingComment) {
      return {
        code: 400,
        success: false,
        message: "Invalid comment",
      };
    }

    const newComment = Comment.create({
      comment: existingComment,
      content: replyCommentInput.content,
      author: existingUser,
    });

    await newComment.save();

    return {
      code: 200,
      success: true,
      message: "Comment added successfully",
    };
  }
  @Mutation((_return) => PostMutationResponse)
  @UseMiddleware(checkAuth)
  async deletePost(
    @Arg("id", (_type) => ID) id: string,
    @Ctx() { user }: Context
  ): Promise<PostMutationResponse> {
    const existingPost = await Post.findOne(id);
    if (!existingPost)
      return {
        code: 400,
        success: false,
        message: "Post not found",
      };

    if (existingPost.authorId !== user.userId) {
      return {
        code: 401,
        success: false,
        message: "Unauthorised",
      };
    }

    await Post.delete({ id });

    return { code: 200, success: true, message: "Post deleted successfully" };
  }
}
