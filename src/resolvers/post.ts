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
import { Post } from "../entities/Post";
import { User } from "../entities/User";
import { checkAuth } from "../middleware/checkAuth";
import { S3Service } from "../services/uploader";
import { Context } from "../types/Context";
import { CreatePostInput } from "../types/Post/CreatePostInput";
import { PostMutationResponse } from "../types/Post/PostMutationResponse";
import { Posts } from "../types/Post/Posts";
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
      comments,
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
        authorId: existingUser?.id,
        tags,
        metaDescription,
        metaKeywords,
        metaTitle,
        publish,
        comments,
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
      comments,
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
    let cover;

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
    existingPost.comments = comments;

    await existingPost.save();

    return {
      code: 200,
      success: true,
      message: "Post updated successfully",
      post: existingPost,
    };
  }

  @Mutation((_return) => PostMutationResponse)
  @UseMiddleware(checkAuth)
  async deletePost(
    @Arg("id", (_type) => ID) id: number,
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
