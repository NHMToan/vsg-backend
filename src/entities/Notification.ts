import { Field, ID, ObjectType } from "type-graphql";
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from "typeorm";
import { NotiMessageKey } from "../types/Notification";

@ObjectType()
@Entity("notification")
export class Notification extends BaseEntity {
  @Field((_type) => ID)
  @PrimaryGeneratedColumn("uuid")
  readonly id!: string;

  @Field()
  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;

  @Field()
  @Column()
  messageKey: NotiMessageKey;

  @Field({ nullable: true })
  @Column({ nullable: true })
  amount: number;

  @Field({ nullable: true })
  @Column({ nullable: true })
  action_object: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  actor_name: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  actor_avatar: string;
}
