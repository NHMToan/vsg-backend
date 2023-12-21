import { FileUpload, GraphQLUpload } from "graphql-upload";
import { Field, InputType, ObjectType } from "type-graphql";
import { IMutationResponse } from "../MutationResponse";

import { Rating } from "../../entities/Rating";
import { RatingCandidate } from "../../entities/RatingCandidate";
import { RatingVote } from "../../entities/RatingVote";
import { FieldError } from "../FieldError";
@ObjectType({ implements: IMutationResponse })
export class RatingMutationResponse implements IMutationResponse {
  code: number;
  success: boolean;
  message?: string;

  @Field((_type) => [FieldError], { nullable: true })
  errors?: FieldError[];
}

@InputType()
export class CreateRatingInput {
  @Field()
  name: string;

  @Field({ nullable: true })
  description: string;

  @Field({ nullable: true })
  start: string;

  @Field({ nullable: true })
  end: string;

  @Field({ nullable: true })
  status?: number;

  @Field({ nullable: true })
  hidden?: boolean;
}

@InputType()
export class CreateCandidateInput {
  @Field()
  ratingId: string;

  @Field((_) => [GraphQLUpload], { nullable: true })
  photos: FileUpload[];
}

@InputType()
export class UpdateCandidateInput {}

@ObjectType()
export class Ratings {
  @Field()
  totalCount!: number;

  @Field()
  hasMore!: boolean;

  @Field((_type) => [Rating])
  results!: Rating[];
}
@ObjectType()
export class RatingVotes {
  @Field()
  totalCount!: number;

  @Field()
  hasMore!: boolean;

  @Field((_type) => [RatingVote])
  results!: RatingVote[];
}
@InputType()
export class CreateRatingCandidateInput {
  @Field()
  name: string;

  @Field((_) => GraphQLUpload, { nullable: true })
  photo1: FileUpload;

  @Field((_) => GraphQLUpload, { nullable: true })
  photo2?: FileUpload;

  @Field((_) => GraphQLUpload, { nullable: true })
  photo3?: FileUpload;

  @Field()
  bio: string;

  @Field({ nullable: true })
  video: string;
}

@ObjectType()
export class Candidates {
  @Field()
  totalCount!: number;

  @Field()
  hasMore!: boolean;

  @Field((_type) => [RatingCandidate])
  results!: RatingCandidate[];
}
