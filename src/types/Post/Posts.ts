import { Field, ObjectType } from "type-graphql";
import { Post } from "../../entities/Post";

@ObjectType()
export class Posts {
  @Field()
  totalCount!: number;

  @Field()
  hasMore!: boolean;

  @Field((_type) => [Post])
  results!: Post[];
}
