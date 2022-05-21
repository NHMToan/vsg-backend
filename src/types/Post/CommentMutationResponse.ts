import { Field, ObjectType } from "type-graphql";
import { Comment } from "../../entities/Comment";
import { FieldError } from "../FieldError";
import { IMutationResponse } from "../MutationResponse";

@ObjectType({ implements: IMutationResponse })
export class CommentMutationResponse implements IMutationResponse {
  code: number;
  success: boolean;
  message?: string;

  @Field({ nullable: true })
  comment?: Comment;

  @Field((_type) => [FieldError], { nullable: true })
  errors?: FieldError[];
}
