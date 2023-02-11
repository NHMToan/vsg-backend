import { FileUpload, GraphQLUpload } from "graphql-upload";
import { Field, InputType, ObjectType } from "type-graphql";
import { ClubNote } from "../../entities/ClubNote";
import { FieldError } from "../FieldError";
import { IMutationResponse } from "../MutationResponse";
@InputType()
export class CreateClubNoteInput {
  @Field()
  clubId: string;

  @Field()
  description: string;

  @Field()
  isPublic: boolean;

  @Field((_) => [GraphQLUpload])
  images: FileUpload[];
}

@InputType()
export class UpdateClubNoteInput {
  @Field()
  description: string;

  @Field()
  isPublic: boolean;
}

@ObjectType({ implements: IMutationResponse })
export class ClubNoteMutationResponse implements IMutationResponse {
  code: number;
  success: boolean;
  message?: string;

  @Field({ nullable: true })
  note?: ClubNote;

  @Field((_type) => [FieldError], { nullable: true })
  errors?: FieldError[];
}
@ObjectType()
export class ClubNotes {
  @Field()
  totalCount!: number;

  @Field()
  hasMore!: boolean;

  @Field((_type) => [ClubNote])
  results!: ClubNote[];
}
