import { Field, ID, ObjectType } from "type-graphql";
import {
  Column,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Game } from "./Game";
import { Score } from "./Score";

@Entity()
@ObjectType()
export class Player {
  @PrimaryGeneratedColumn("uuid")
  @Field(() => ID)
  id: string;

  @Column()
  @Field()
  name: string;

  @OneToMany(() => Score, (score) => score.player)
  @Field(() => [Score])
  scores: Score[];

  @ManyToOne(() => Game, (game) => game.players)
  @Field(() => Game)
  game: Game;
}
