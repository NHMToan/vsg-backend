import { Field, ID, ObjectType } from "type-graphql";
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  RelationId,
  UpdateDateColumn,
} from "typeorm";
import { Comment } from "./Comment";
import { User } from "./User";

@ObjectType()
@Entity()
export class Post extends BaseEntity {
  @Field((_type) => ID)
  @PrimaryGeneratedColumn("uuid")
  readonly id!: string;

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
  @Column({ default: true })
  allowComments: boolean;

  @Field((_type) => User)
  @ManyToOne((_type) => User)
  author: User;

  @RelationId((post: Post) => post.author)
  authorId: string;

  @Field((_type) => [Comment])
  @OneToMany((_type) => Comment, (comment) => comment.post, {
    cascade: ["insert"],
  })
  comments: Comment[];

  @Field((_type) => [User], { defaultValue: [] })
  @ManyToMany((_type) => User, (user) => user.favoritePosts)
  @JoinTable()
  favoritePerson: Promise<User[]>;

  @Field()
  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;

  @Field()
  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt: Date;
}
