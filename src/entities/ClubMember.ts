import { Field, ID, ObjectType } from "type-graphql";
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  RelationId,
  UpdateDateColumn,
} from "typeorm";
import { Club } from "./Club";
import { Profile } from "./Profile";

@ObjectType()
@Entity()
export class ClubMember extends BaseEntity {
  @Field((_type) => ID)
  @PrimaryGeneratedColumn("uuid")
  readonly id!: string;

  @Field({ nullable: true })
  @Column({ nullable: true })
  role!: number;

  @Field()
  @Column()
  status!: number;

  @Field((_type) => Profile)
  @ManyToOne((_type) => Profile)
  profile: Profile;

  @RelationId((clubmem: ClubMember) => clubmem.profile)
  @Column()
  profileId: string;

  @Field()
  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;

  @Field()
  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt: Date;

  @Field((_) => Club)
  @ManyToOne((_type) => Club)
  club: Club;

  @RelationId((rate: ClubMember) => rate.club)
  @Column()
  clubId: string;
}
