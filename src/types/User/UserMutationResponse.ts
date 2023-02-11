import { Field, ObjectType } from "type-graphql";
import { Profile } from "../../entities/Profile";
import { User } from "../../entities/User";
import { IMutationResponse } from "../MutationResponse";

@ObjectType({ implements: IMutationResponse })
export class UserMutationResponse implements IMutationResponse {
  code: number;
  success: boolean;
  message?: string;

  @Field({ nullable: true })
  user?: User;

  @Field({ nullable: true })
  profile?: Profile;

  @Field({ nullable: true })
  accessToken?: string;
}
