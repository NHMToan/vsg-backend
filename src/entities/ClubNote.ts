import { Field, ID, ObjectType } from "type-graphql";
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  RelationId,
  UpdateDateColumn,
} from "typeorm";
import { Club } from "./Club";

@ObjectType()
@Entity()
export class ClubNote extends BaseEntity {
  @Field((_type) => ID)
  @PrimaryGeneratedColumn("uuid")
  readonly id: string;

  @Field()
  @Column()
  description: string;

  @Field((_type) => Club)
  @ManyToOne((_type) => Club)
  club: ClubNote;

  @RelationId((vote: ClubNote) => vote.club)
  @Column()
  clubId: string;

  @Field()
  @Column()
  isPublic: boolean;

  @Field()
  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;

  @Field()
  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt: Date;

  @Field((_type) => [String], { nullable: true })
  @Column("text", { array: true, default: [] })
  images: string[];
}
