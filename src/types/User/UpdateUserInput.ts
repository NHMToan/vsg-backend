import { Field, InputType } from "type-graphql";

@InputType()
export class UpdateUserInput {
  @Field()
  firstName: string;

  @Field()
  lastName: string;
}
