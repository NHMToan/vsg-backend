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
import { Notification } from "./Notification";
import { Profile } from "./Profile";

@ObjectType()
@Entity("userNotification")
export class UserNotification extends BaseEntity {
  @Field((_type) => ID)
  @PrimaryGeneratedColumn("uuid")
  readonly id!: string;

  @Field()
  @Column({ nullable: true, type: "timestamptz" })
  read_at: Date;

  @Field()
  @Column({ nullable: true, default: false })
  is_read: boolean;

  @Field()
  @Column({ nullable: true, default: false })
  is_seen: boolean;

  @Field((_) => Notification)
  @ManyToOne((_type) => Notification)
  notification: Notification;

  @RelationId((userNote: UserNotification) => userNote.notification)
  notificationId: string;

  @Field((_type) => Profile)
  @ManyToOne((_type) => Profile)
  profile: Profile;

  @RelationId((userNote: UserNotification) => userNote.profile)
  profileId: string;

  @Field()
  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;
}
