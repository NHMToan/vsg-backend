import { FileUpload, GraphQLUpload } from "graphql-upload";
import { Field, InputType } from "type-graphql";

@InputType()
export class UpdatePostInput {
  @Field()
  title: string;

  @Field()
  content: string;

  @Field((_) => GraphQLUpload, { nullable: true })
  coverFile: FileUpload;

  @Field({ nullable: true })
  description!: string;

  @Field((_) => [String], { nullable: true })
  tags!: string[];

  @Field({ nullable: true })
  metaDescription!: string;

  @Field((_) => [String], { nullable: true })
  metaKeywords!: string[];

  @Field({ nullable: true })
  metaTitle!: string;

  @Field()
  publish!: boolean;

  @Field()
  comments!: boolean;
}
