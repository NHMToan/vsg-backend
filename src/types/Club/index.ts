import { FileUpload, GraphQLUpload } from "graphql-upload";
import { Field, InputType, ObjectType } from "type-graphql";
import { Club } from "../../entities/Club";
import { ClubMember } from "../../entities/ClubMember";
import { FieldError } from "../FieldError";
import { IMutationResponse } from "../MutationResponse";

@ObjectType({ implements: IMutationResponse })
export class ClubMutationResponse implements IMutationResponse {
  code: number;
  success: boolean;
  message?: string;

  @Field({ nullable: true })
  club?: Club;

  @Field((_type) => [FieldError], { nullable: true })
  errors?: FieldError[];
}

@ObjectType()
export class Clubs {
  @Field()
  totalCount!: number;

  @Field()
  hasMore!: boolean;

  @Field((_type) => [Club])
  results!: Club[];
}

@InputType()
export class CreateClubInput {
  @Field()
  title: string;

  @Field((_) => GraphQLUpload)
  coverFile: FileUpload;

  @Field()
  description: string;

  @Field()
  publish: boolean;

  @Field()
  key: string;
}

@InputType()
export class UpdateClubInput {
  @Field()
  title: string;

  @Field((_) => GraphQLUpload)
  coverFile: FileUpload;

  @Field()
  description: string;

  @Field()
  publish: boolean;
}

@ObjectType()
export class Clubmembers {
  @Field()
  totalCount!: number;

  @Field()
  hasMore!: boolean;

  @Field((_type) => [ClubMember])
  results!: ClubMember[];
}
