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

import { Field, ID, Int, ObjectType } from "type-graphql";
import { ClubEvent } from "./ClubEvent";
import { ClubMember } from "./ClubMember";

@Entity()
@ObjectType()
export class Vote extends BaseEntity {
  @Field((_type) => ID)
  @PrimaryGeneratedColumn("uuid")
  readonly id!: string;

  @Field((_type) => Int)
  @Column({ type: "int" })
  value: number;

  @Field((_type) => ClubMember)
  @ManyToOne((_type) => ClubMember)
  member: ClubMember;

  @RelationId((vote: Vote) => vote.member)
  memberId: string;

  @Field()
  @CreateDateColumn()
  createdAt: Date;

  @Field()
  @UpdateDateColumn()
  updatedAt: Date;

  @Field((_type) => Int)
  @Column({ type: "int" })
  status: number;

  @Field((_type) => ClubEvent)
  @ManyToOne((_type) => ClubEvent)
  event: ClubEvent;

  @Field({ nullable: true })
  @Column({ nullable: true })
  paid!: string;

  @RelationId((vote: Vote) => vote.event)
  eventId: string;
}
