import { Field, ObjectType } from "type-graphql";
import { Following } from "../../entities/Following";
import { FieldError } from "../FieldError";
import { IMutationResponse } from "../MutationResponse";

@ObjectType({ implements: IMutationResponse })
export class FollowingMutaionResponse implements IMutationResponse {
  code: number;
  success: boolean;
  message?: string;

  @Field({ nullable: true })
  following?: Following;

  @Field((_type) => [FieldError], { nullable: true })
  errors?: FieldError[];
}
