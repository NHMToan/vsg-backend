import { Field, ObjectType } from "type-graphql";
import { Game } from "../../entities/Game";
import { FieldError } from "../FieldError";
import { IMutationResponse } from "../MutationResponse";

@ObjectType({ implements: IMutationResponse })
export class GameMutationResponse implements IMutationResponse {
  code: number;
  success: boolean;
  message?: string;

  @Field({ nullable: true })
  game?: Game;

  @Field((_type) => [FieldError], { nullable: true })
  errors?: FieldError[];
}
