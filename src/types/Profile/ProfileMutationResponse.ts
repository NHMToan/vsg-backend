import { Field, ObjectType } from "type-graphql";
import { Profile } from "../../entities/Profile";
import { FieldError } from "../FieldError";
import { IMutationResponse } from "../MutationResponse";

@ObjectType({ implements: IMutationResponse })
export class ProfileMutationResponse implements IMutationResponse {
  code: number;
  success: boolean;
  message?: string;

  @Field({ nullable: true })
  profile?: Profile;

  @Field((_type) => [FieldError], { nullable: true })
  errors?: FieldError[];
}
