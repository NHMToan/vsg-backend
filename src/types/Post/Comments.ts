import { Field, ObjectType } from "type-graphql";
import { Comment } from "../../entities/Comment";

@ObjectType()
export class Comments {
  @Field()
  totalCount!: number;

  @Field()
  hasMore!: boolean;

  @Field((_type) => [Comment])
  results!: Comment[];
}
