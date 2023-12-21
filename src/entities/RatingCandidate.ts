import { Field, ID, ObjectType } from "type-graphql";
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  RelationId,
} from "typeorm";
import { Rating } from "./Rating";
import { RatingVote } from "./RatingVote";

@ObjectType()
@Entity("ratingCandidate")
export class RatingCandidate extends BaseEntity {
  @Field((_type) => ID)
  @PrimaryGeneratedColumn("uuid")
  readonly id!: string;

  @Field()
  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;

  @Field()
  @Column()
  name!: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  bio!: string;

  @ManyToOne((_type) => Rating)
  rating: Rating;

  @Column()
  @RelationId((rate: RatingCandidate) => rate.rating)
  ratingId: string;

  @Field((_type) => [RatingVote])
  @OneToMany((_type) => RatingVote, (vote) => vote.votedFor, {
    cascade: ["insert"],
  })
  votes: RatingVote[];

  @Field()
  @Column()
  photo1!: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  video!: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  photo2!: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  photo3!: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  order: number;
}
