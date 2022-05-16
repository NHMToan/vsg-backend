import { Field, ID, ObjectType } from "type-graphql";
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { User } from "./User";

@ObjectType()
@Entity()
export class Post extends BaseEntity {
  @Field((_type) => ID)
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Field()
  @Column()
  title!: string;

  @Field()
  @Column()
  content!: string;

  @Field()
  @Column()
  cover!: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  description: string;

  @Field((_) => [String], { nullable: true })
  @Column("text", { nullable: true, array: true })
  tags: string[];

  @Field({ nullable: true })
  @Column({ nullable: true })
  metaDescription: string;

  @Field((_) => [String], { nullable: true })
  @Column("text", { nullable: true, array: true })
  metaKeywords: string[];

  @Field({ nullable: true })
  @Column({ nullable: true })
  metaTitle: string;

  @Field()
  @Column()
  publish: boolean;

  @Field()
  @Column()
  comments: boolean;

  @Field()
  @Column()
  authorId!: string;

  @Field((_type) => User)
  @ManyToOne(() => User, (user) => user.posts)
  author!: User;

  @Field()
  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;

  @Field()
  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt: Date;
}
