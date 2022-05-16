import { Field, ID, ObjectType } from "type-graphql";
import {
  BaseEntity,
  Column,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@ObjectType()
@Entity()
export class Profile extends BaseEntity {
  @Field((_type) => ID)
  @PrimaryGeneratedColumn()
  id!: number;

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

  @Field()
  @Column({ default: 0 })
  follower: number;

  @Field()
  @Column({ default: 0 })
  following: number;

  @Field()
  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt: Date;
}
