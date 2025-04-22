import { Field, ID, ObjectType } from "type-graphql";
import {
  BaseEntity,
  Column,
  Entity,
  ManyToMany,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Conversation } from "./Conversation";
import { Following } from "./Following";
import { Friendship } from "./Friendship";
import { User } from "./User";

@ObjectType()
@Entity()
export class Profile extends BaseEntity {
  @Field((_type) => ID)
  @PrimaryGeneratedColumn("uuid")
  readonly id!: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  displayName: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  about: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  avatar: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  cover: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  gender: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  country: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  role: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  company: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  position: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  email: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  phoneNumber: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  facebookLink: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  instagramLink: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  linkedinLink: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  twitterLink: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  portfolioLink: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  school: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  dob: string;

  @Field()
  @Column({ default: 0 })
  follower: number;

  @Field()
  @Column({ default: 0 })
  following: number;

  @Field()
  @Column({ default: 0 })
  friend: number;

  @Field()
  @Column({ nullable: true, default: 1 })
  status: number;

  @Field()
  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt: Date;

  @OneToOne(() => User, (user) => user.profile)
  user: User;

  @Field((_type) => [Following])
  @OneToMany((_type) => Following, (follow) => follow.follower, {
    cascade: ["remove"],
  })
  followings: Following[];

  @Field((_type) => [Following])
  @OneToMany((_type) => Following, (follow) => follow.followedTo, {
    cascade: ["remove"],
  })
  followers: Following[];

  @Field((_type) => [Friendship])
  @OneToMany((_type) => Friendship, (friend) => friend.sender, {
    cascade: ["remove"],
  })
  friends: Friendship[];

  @Field((_type) => [Conversation])
  @ManyToMany((_) => Conversation, (con) => con.members, {
    cascade: ["remove"],
  })
  conversations: Conversation[];
}
