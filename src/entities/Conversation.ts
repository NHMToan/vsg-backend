import { Field, ID, ObjectType } from "type-graphql";
import {
  BaseEntity,
  Column,
  Entity,
  JoinTable,
  ManyToMany,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Message } from "./Message";
import { Profile } from "./Profile";

@ObjectType()
@Entity("conversation")
export class Conversation extends BaseEntity {
  @Field((_type) => ID)
  @PrimaryGeneratedColumn("uuid")
  readonly id!: string;

  @Field()
  @Column()
  type!: string;

  @Field()
  @Column({ default: 0 })
  unreadCount!: number;

  @Field((_type) => [Message])
  @OneToMany((_type) => Message, (message) => message.conversation, {
    cascade: ["insert"],
  })
  messages: Message[];

  @Field((_type) => [Profile])
  @ManyToMany((_type) => Profile, (mem) => mem.conversations)
  @JoinTable()
  members: Profile[];

  @Field()
  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt: Date;
}
