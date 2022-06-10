import { Field, ID, ObjectType } from "type-graphql";
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  JoinTable,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  RelationId,
  UpdateDateColumn,
} from "typeorm";
import { ClubMember } from "./ClubMember";
import { Profile } from "./Profile";

@ObjectType()
@Entity()
export class Club extends BaseEntity {
  @Field((_type) => ID)
  @PrimaryGeneratedColumn("uuid")
  readonly id!: string;

  @Field()
  @Column()
  title!: string;

  @Field()
  @Column()
  description!: string;

  @Field()
  @Column()
  cover!: string;

  @Field()
  @Column()
  publish: boolean;

  @Field((_type) => Profile)
  @ManyToOne((_type) => Profile)
  admin: Profile;

  @RelationId((post: Club) => post.admin)
  @Column()
  adminId: string;

  @Field((_type) => [ClubMember])
  @OneToMany((_type) => ClubMember, (mem) => mem.club, { cascade: ["insert"] })
  @JoinTable()
  members: ClubMember[];

  @Field()
  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;

  @Field()
  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt: Date;
}
