import { Field, ID, ObjectType } from "type-graphql";
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  RelationId,
  UpdateDateColumn,
} from "typeorm";
import { Post } from "./Post";
import { User } from "./User";

@ObjectType()
@Entity("comment")
export class Comment extends BaseEntity {
  @Field((_type) => ID)
  @PrimaryGeneratedColumn("uuid")
  readonly id!: string;

  @Field()
  @Column()
  content!: string;

  @ManyToOne((_type) => Post)
  post: Post;

  @RelationId((rate: Comment) => rate.post)
  postId: string;

  @Field((_type) => User)
  @ManyToOne((_type) => User)
  author: User;

  @RelationId((comment: Comment) => comment.author)
  authorId: string;

  @Field((_type) => Comment)
  @ManyToOne((_type) => Comment, { onDelete: "CASCADE" })
  comment: Comment;

  @RelationId((comment: Comment) => comment.comment)
  commentId: string;

  @Field((_type) => [Comment], { defaultValue: [] })
  @OneToMany((_type) => Comment, (comment) => comment.comment, {
    cascade: ["insert"],
  })
  replyComments: Comment[];

  @Field()
  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;

  @Field()
  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt: Date;
}
