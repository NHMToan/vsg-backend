import { Field, ID, InputType } from "type-graphql";

@InputType()
export class CommentInput {
  @Field((_type) => ID)
  postId: string;

  @Field()
  content: string;
}
