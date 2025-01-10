import { Field, ID, ObjectType } from "type-graphql";
import {
  BaseEntity,
  Column,
  Entity,
  JoinColumn,
  ManyToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Game } from "./Game";
import { Post } from "./Post";
import { Profile } from "./Profile";
@ObjectType()
@Entity()
export class User extends BaseEntity {
  @Field((_type) => ID)
  @PrimaryGeneratedColumn("uuid")
  readonly id!: string;

  @Field()
  @Column({ unique: true })
  email!: string;

  @Column({ nullable: true })
  password!: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  firstName: string;

  @Field()
  @Column()
  lastName!: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  provider!: string;

  @Field()
  @Column({ nullable: true, default: true })
  isPublic: boolean;

  @Field()
  @Column({ nullable: true, default: "user" })
  role: string;

  @Column({ nullable: true })
  profileId: string;

  @OneToOne(() => Profile, (details) => details.user, {
    cascade: ["insert"],
  })
  @JoinColumn()
  profile: Profile;

  @Field(() => [Post])
  @ManyToMany((_type) => Post, (post) => post.favoritePerson)
  favoritePosts: Promise<Post[]>;

  @ManyToMany(() => Game, (game) => game.sharing)
  @Field(() => [Game])
  sharedGames: Game[];

  @Field()
  @Column({ nullable: true, default: 1 })
  status: number;
}
