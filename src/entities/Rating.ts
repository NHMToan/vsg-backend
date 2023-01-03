import { Field, ID, ObjectType } from "type-graphql";
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { RatingCandidate } from "./RatingCandidate";

@ObjectType()
@Entity("rating")
export class Rating extends BaseEntity {
  @Field((_type) => ID)
  @PrimaryGeneratedColumn("uuid")
  readonly id!: string;

  @Field()
  @Column()
  name!: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  description: string;

  @Field((_type) => [RatingCandidate])
  @OneToMany((_type) => RatingCandidate, (can) => can.rating, {
    cascade: ["insert"],
  })
  candidates: RatingCandidate[];

  @Field()
  @Column()
  start: string;

  @Field()
  @Column()
  end: string;

  @Field()
  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;

  @Field()
  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt: Date;

  @Field()
  @Column()
  status: number;
}
