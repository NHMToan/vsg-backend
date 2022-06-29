import { FileUpload, GraphQLUpload } from "graphql-upload";
import { ClubEvent } from "../../entities/ClubEvent";
import { ArgsType, Field, ID, InputType, Int, ObjectType } from "type-graphql";
import { Club } from "../../entities/Club";
import { ClubMember } from "../../entities/ClubMember";
import { FieldError } from "../FieldError";
import { IMutationResponse } from "../MutationResponse";
import { Vote } from "../../entities/Vote";

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

@ObjectType({ implements: IMutationResponse })
export class EventMutationResponse implements IMutationResponse {
  code: number;
  success: boolean;
  message?: string;

  @Field({ nullable: true })
  event?: ClubEvent;

  @Field((_type) => [FieldError], { nullable: true })
  errors?: FieldError[];
}

@ObjectType({ implements: IMutationResponse })
export class EventVoteMutationResponse implements IMutationResponse {
  code: number;
  success: boolean;
  message?: string;

  @Field({ nullable: true })
  vote?: Vote;

  @Field((_type) => [FieldError], { nullable: true })
  errors?: FieldError[];
}

@InputType()
export class CreateEventInput {
  @Field()
  clubId: string;

  @Field()
  title: string;

  @Field()
  description: string;

  @Field()
  start: string;

  @Field()
  end: string;

  @Field()
  color: string;

  @Field({ nullable: true })
  address: string;

  @Field({ nullable: true })
  addressLink: string;

  @Field()
  slot: number;

  @Field({ nullable: true })
  isInstant: boolean;
}
@InputType()
export class CreateVoteInput {
  @Field()
  eventId: string;

  @Field()
  value: number;

  @Field()
  status: number;
}
@ObjectType()
export class Events {
  @Field()
  totalCount!: number;

  @Field()
  hasMore!: boolean;

  @Field((_type) => [ClubEvent])
  results!: ClubEvent[];
}
@ObjectType()
export class Votes {
  @Field()
  totalCount!: number;

  @Field()
  hasMore!: boolean;

  @Field((_type) => [Vote])
  results!: Vote[];
}

export interface NewVotePayload {
  eventId: string;
  status: number;
  voteCount?: number;
  waitingCount?: number;
}

@ObjectType()
export class NewVoteSubscriptionData {
  @Field({ nullable: true })
  voteCount?: number;

  @Field({ nullable: true })
  waitingCount?: number;

  @Field()
  eventId!: string;

  @Field()
  status!: number;
}

@ArgsType()
export class NewVoteArgs {
  @Field((_type) => ID)
  eventId: string;

  @Field((_type) => Int)
  status: number;
}
