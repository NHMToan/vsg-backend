import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  RelationId,
} from "typeorm";

import { Field, ID, ObjectType } from "type-graphql";
import { Rating } from "./Rating";
import { RatingCandidate } from "./RatingCandidate";
import { User } from "./User";

@Entity()
@ObjectType()
export class RatingVote extends BaseEntity {
  @Field((_type) => ID)
  @PrimaryGeneratedColumn("uuid")
  readonly id!: string;

  @Field((_type) => User)
  @ManyToOne((_type) => User)
  voter: User;

  @Column()
  @RelationId((vote: RatingVote) => vote.voter)
  voterId: string;

  @Field()
  @CreateDateColumn()
  createdAt: Date;

  @Field((_type) => RatingCandidate)
  @ManyToOne((_type) => RatingCandidate)
  votedFor: RatingCandidate;

  @Column()
  @RelationId((vote: RatingVote) => vote.votedFor)
  votedForId: string;

  @Field((_type) => Rating)
  @ManyToOne((_type) => Rating)
  rating: Rating;

  @Column()
  @RelationId((vote: RatingVote) => vote.rating)
  ratingId: string;
}
