import { Field, ID, ObjectType } from "type-graphql";
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Player } from "./Player";
import { Round } from "./Round";

@Entity()
@ObjectType()
export class Score {
  @PrimaryGeneratedColumn("uuid")
  @Field(() => ID)
  id: string;

  @Column()
  @Field()
  points: number;

  @ManyToOne(() => Player, (player) => player.scores)
  @Field(() => Player)
  player: Player;

  @ManyToOne(() => Round, (round) => round.scores, { onDelete: "CASCADE" })
  @Field(() => Round)
  round: Round;
}
