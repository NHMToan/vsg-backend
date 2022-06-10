import { Field, ObjectType } from "type-graphql";
import { Friendship } from "../../entities/Friendship";
import { FieldError } from "../FieldError";
import { IMutationResponse } from "../MutationResponse";

@ObjectType({ implements: IMutationResponse })
export class FriendMutaionResponse implements IMutationResponse {
  code: number;
  success: boolean;
  message?: string;

  @Field({ nullable: true })
  friendship?: Friendship;

  @Field((_type) => [FieldError], { nullable: true })
  errors?: FieldError[];
}
