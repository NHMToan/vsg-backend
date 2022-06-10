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
import { Profile } from "./Profile";

@ObjectType()
@Entity()
export class Friendship extends BaseEntity {
  @Field((_type) => ID)
  @PrimaryGeneratedColumn()
  readonly id!: number;

  @Field()
  @Column({ default: 1 })
  status!: number;

  @Field((_) => Profile)
  @ManyToOne((_type) => Profile)
  sender: Profile;

  @RelationId((follow: Friendship) => follow.sender)
  senderId: string;

  @Field((_) => Profile)
  @ManyToOne((_type) => Profile)
  sendTo: Profile;

  @RelationId((follow: Friendship) => follow.sender)
  sendToId: string;

  @Field()
  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;
}
