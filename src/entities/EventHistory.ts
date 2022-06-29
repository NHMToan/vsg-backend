import { Field, ID, ObjectType } from "type-graphql";
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  RelationId,
} from "typeorm";
import { ClubEvent } from "./ClubEvent";
import { ClubMember } from "./ClubMember";

@ObjectType()
@Entity()
export class EventHistory extends BaseEntity {
  @Field((_type) => ID)
  @PrimaryGeneratedColumn("uuid")
  readonly id: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  value: number;

  @Field()
  @Column()
  type: string;

  @Field((_type) => ClubMember)
  @ManyToOne((_type) => ClubMember)
  member: ClubMember;

  @RelationId((vote: EventHistory) => vote.member)
  memberId: string;

  @Field((_type) => ClubMember, { nullable: true })
  @ManyToOne((_type) => ClubMember)
  object: ClubMember;

  @RelationId((vote: EventHistory) => vote.member)
  objectId: string;

  @ManyToOne((_type) => ClubEvent)
  event: ClubEvent;

  @RelationId((vote: EventHistory) => vote.event)
  eventId: string;

  @Field()
  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;
}
