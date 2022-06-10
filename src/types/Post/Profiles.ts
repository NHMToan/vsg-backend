import { Field, ObjectType } from "type-graphql";
import { Profile } from "../../entities/Profile";

@ObjectType()
export class Profiles {
  @Field()
  totalCount!: number;

  @Field()
  hasMore!: boolean;

  @Field((_type) => [Profile])
  results!: Profile[];
}
