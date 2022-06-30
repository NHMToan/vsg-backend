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
  UpdateDateColumn,
} from "typeorm";
import { Club } from "./Club";
import { ClubMember } from "./ClubMember";
import { Vote } from "./Vote";

@ObjectType()
@Entity()
export class ClubEvent extends BaseEntity {
  @Field((_type) => ID)
  @PrimaryGeneratedColumn("uuid")
  readonly id: string;

  @Field()
  @Column()
  title: string;

  @Field()
  @Column()
  description: string;

  @Field()
  @Column()
  start: string;

  @Field()
  @Column()
  end: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  time: string;

  @Field()
  @Column()
  color: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  address: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  addressLink: string;

  @Field()
  @Column()
  slot: number;

  @Field()
  @Column()
  status: number;

  @Field()
  @Column()
  show: boolean;

  @Field((_type) => Club)
  @ManyToOne((_type) => Club)
  club: ClubEvent;

  @RelationId((vote: ClubEvent) => vote.club)
  clubId: string;

  @Field((_type) => ClubMember)
  @ManyToOne((_type) => ClubMember)
  createdBy: ClubMember;

  @RelationId((event: ClubEvent) => event.createdBy)
  createdById: string;

  @Field((_type) => [Vote])
  @OneToMany((_type) => Vote, (vote) => vote.event, { cascade: ["insert"] })
  votes: Vote[];

  @Field()
  voteCount: number;

  @Field()
  waitingCount: number;

  @Field()
  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;

  @Field()
  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt: Date;
}
