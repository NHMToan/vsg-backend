import { Field, ID, ObjectType } from "type-graphql";
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  RelationId,
} from "typeorm";
import { Player } from "./Player";
import { Round } from "./Round";
import { User } from "./User";
// status 1: Live status 2: off-live status 3: Finish
@Entity()
@ObjectType()
export class Game {
  @PrimaryGeneratedColumn("uuid")
  @Field(() => ID)
  id: string;

  @OneToMany(() => Round, (round) => round.game, {
    cascade: true,
    onDelete: "CASCADE",
  })
  @Field(() => [Round])
  rounds: Round[];

  @Field((_type) => User)
  @ManyToOne((_type) => User)
  createdBy: User;

  @RelationId((game: Game) => game.createdBy)
  @Column()
  createdById: string;

  @ManyToMany(() => User, (user) => user.sharedGames)
  @JoinTable()
  @Field(() => [User])
  sharing: User[];

  @OneToMany(() => Player, (player) => player.game, {
    cascade: true,
    onDelete: "CASCADE",
  })
  @Field(() => [Player])
  players: Player[];

  @Field()
  @Column({ default: 1 })
  status: number;

  @Field()
  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;
}
