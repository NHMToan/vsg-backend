import { Field, ObjectType } from "type-graphql";
import { Round } from "../../entities/Round";
import { FieldError } from "../FieldError";
import { IMutationResponse } from "../MutationResponse";

@ObjectType({ implements: IMutationResponse })
export class RoundMutationResponse implements IMutationResponse {
  code: number;
  success: boolean;
  message?: string;

  @Field({ nullable: true })
  round?: Round;

  @Field((_type) => [FieldError], { nullable: true })
  errors?: FieldError[];
}
