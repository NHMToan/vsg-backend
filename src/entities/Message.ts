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
import { Conversation } from "./Conversation";
import { Profile } from "./Profile";

@ObjectType()
@Entity("message")
export class Message extends BaseEntity {
  @Field((_type) => ID)
  @PrimaryGeneratedColumn("uuid")
  readonly id!: string;

  @Field()
  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;

  @Field((_type) => Profile)
  @ManyToOne((_type) => Profile)
  sender: Profile;

  @RelationId((message: Message) => message.sender)
  @Column()
  senderId: string;

  @Field()
  @Column()
  contentType!: string;

  @Field()
  @Column()
  content!: string;

  @Field({ defaultValue: false })
  @Column({ default: false })
  isRead: boolean;

  @Field((_) => [String], { nullable: true })
  @Column("text", { nullable: true, array: true })
  attachments!: string[];

  @ManyToOne((_type) => Conversation)
  conversation: Conversation;

  @RelationId((rate: Message) => rate.conversation)
  @Column()
  conversationId: string;
}
