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
import { Vote } from "./Vote";

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
  @Column()
  memberId: string;

  @Field((_type) => Vote, { nullable: true })
  @ManyToOne((_type) => Vote, { nullable: true })
  object: Vote;

  @RelationId((item: EventHistory) => item.object)
  @Column({ nullable: true })
  objectId: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  objectString: string;

  @Field((_type) => ClubEvent)
  @ManyToOne((_type) => ClubEvent)
  event: ClubEvent;

  @RelationId((vote: EventHistory) => vote.event)
  @Column()
  eventId: string;

  @Field()
  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;
}
