import { FileUpload, GraphQLUpload } from "graphql-upload";
import { Field, InputType } from "type-graphql";
@InputType()
export class CreatePostInput {
  @Field()
  title: string;

  @Field()
  content: string;

  @Field((_) => GraphQLUpload)
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
