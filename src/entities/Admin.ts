import { Field, ID, ObjectType } from "type-graphql";
import { BaseEntity, Column, Entity, PrimaryGeneratedColumn } from "typeorm";
@ObjectType()
@Entity()
export class Admin extends BaseEntity {
  @Field((_type) => ID)
  @PrimaryGeneratedColumn("uuid")
  readonly id!: string;

  @Field()
  @Column({ unique: true })
  account!: string;

  @Column({ nullable: true })
  password!: string;
}
