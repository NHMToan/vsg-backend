import { Field, ID, ObjectType } from "type-graphql";
import {
  BaseEntity,
  Column,
  Entity,
  JoinColumn,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Post } from "./Post";
import { Profile } from "./Profile";

@ObjectType()
@Entity()
export class User extends BaseEntity {
  @Field((_type) => ID)
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Field()
  @Column({ unique: true })
  email!: string;

  @Column()
  password!: string;

  @Field()
  @Column({ nullable: true })
  firstName: string;

  @Field()
  @Column()
  lastName!: string;

  @Field()
  @Column({ nullable: true, default: true })
  isPublic: boolean;

  @Field()
  @Column({ nullable: true, default: "user" })
  role: string;

  @OneToMany(() => Post, (post) => post.author)
  posts: Post[];

  @Column({ nullable: true })
  profileId: number;

  @OneToOne(() => Profile)
  @JoinColumn()
  profile: Profile;
}
