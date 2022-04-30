import { Field, ID, ObjectType } from "type-graphql";
import {
  BaseEntity,
  Column,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Post } from "./Post";

@ObjectType()
@Entity()
export class User extends BaseEntity {
  @Field((_type) => ID)
  @PrimaryGeneratedColumn()
  id!: number;

  @Field()
  @Column({ unique: true })
  username!: string;

  @Column()
  password!: string;

  @Field({ nullable: true })
  @Column({ nullable: true, default: "" })
  name!: string;

  @OneToMany(() => Post, (post) => post.user)
  posts: Post[];

  @Column({ default: 0 })
  tokenVersion: number;
}
