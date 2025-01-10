import { Field, ID, ObjectType } from "type-graphql";
import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  RelationId,
} from "typeorm";
import { Game } from "./Game";
import { Score } from "./Score";

@Entity()
@ObjectType()
export class Round {
  @PrimaryGeneratedColumn("uuid")
  @Field(() => ID)
  id: string;

  @OneToMany(() => Score, (score) => score.round, {
    cascade: true,
    onDelete: "CASCADE",
  })
  @Field(() => [Score])
  scores: Score[];

  @ManyToOne(() => Game, (game) => game.rounds)
  @Field(() => Game)
  game: Game;

  @RelationId((round: Round) => round.game)
  @Column()
  gameId: string;

  @Field()
  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;
}
