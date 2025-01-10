import { Field, ObjectType } from "type-graphql";
import { Game } from "../../entities/Game";

@ObjectType()
export class Games {
  @Field()
  totalCount!: number;

  @Field()
  hasMore!: boolean;

  @Field((_type) => [Game])
  results!: Game[];
}
