import { Field, ID, InputType, Int } from "type-graphql";

@InputType()
class PlayerInput {
  @Field()
  name: string;
}

@InputType()
class CreateGameInput {
  @Field((_) => [PlayerInput], { nullable: true })
  players!: PlayerInput[];
}
@InputType()
class PlayerScoreInput {
  @Field(() => ID)
  playerId: string;

  @Field(() => Int)
  points: number;
}
export { CreateGameInput, PlayerInput, PlayerScoreInput };
