import { Field, InputType } from "type-graphql";

@InputType()
export class UpdateProfileInput {
  @Field({ nullable: true })
  displayName: string;

  @Field({ nullable: true })
  avatar: string;

  @Field({ nullable: true })
  cover: string;

  @Field({ nullable: true })
  category: string;

  @Field({ nullable: true })
  gender: string;

  @Field({ nullable: true })
  country: string;

  @Field({ nullable: true })
  role: string;

  @Field({ nullable: true })
  company: string;

  @Field({ nullable: true })
  position: string;

  @Field({ nullable: true })
  email: string;

  @Field({ nullable: true })
  facebookLink: string;

  @Field({ nullable: true })
  instagramLink: string;

  @Field({ nullable: true })
  linkedinLink: string;

  @Field({ nullable: true })
  twitterLink: string;

  @Field({ nullable: true })
  portfolioLink: string;

  @Field({ nullable: true })
  school: string;

  @Field({ nullable: true })
  about: string;

  @Field({ nullable: true })
  phoneNumber: string;
}
