import { Field, ID, InputType } from "type-graphql";

@InputType()
export class ReplyCommentInput {
  @Field((_type) => ID)
  commentId: string;

  @Field()
  content: string;
}
