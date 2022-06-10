import { Field, ID, ObjectType } from "type-graphql";
import {
  BaseEntity,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  RelationId,
} from "typeorm";
import { Profile } from "./Profile";

@ObjectType()
@Entity()
export class Following extends BaseEntity {
  @Field((_type) => ID)
  @PrimaryGeneratedColumn()
  readonly id!: number;

  @Field((_) => Profile)
  @ManyToOne((_type) => Profile, (profile) => profile.followers)
  follower: Profile;

  @RelationId((follow: Following) => follow.follower)
  followerId: string;

  @Field((_) => Profile)
  @ManyToOne((_type) => Profile, (profile) => profile.followings)
  followedTo: Profile;

  @RelationId((follow: Following) => follow.followedTo)
  followedToId: string;

  @Field()
  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;
}
