import { Field, InputType, ObjectType } from "type-graphql";
import { Admin } from "../../entities/Admin";
import { User } from "../../entities/User";

import { IMutationResponse } from "../MutationResponse";

@ObjectType({ implements: IMutationResponse })
export class AdminMutationResponse implements IMutationResponse {
  code: number;
  success: boolean;
  message?: string;

  @Field({ nullable: true })
  user?: Admin;

  @Field({ nullable: true })
  accessToken?: string;
}

@InputType()
export class AdminLoginInput {
  @Field()
  account: string;

  @Field()
  password: string;
}

@InputType()
export class AdminRegisterInput {
  @Field()
  account: string;

  @Field()
  password: string;

  @Field()
  key: string;
}
@ObjectType()
export class Users {
  @Field()
  totalCount!: number;

  @Field()
  hasMore!: boolean;

  @Field((_type) => [User])
  results!: User[];
}
