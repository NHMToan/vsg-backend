import { FileUpload, GraphQLUpload } from "graphql-upload";
import { Arg, Ctx, Mutation, Resolver, UseMiddleware } from "type-graphql";
import { Profile } from "../entities/Profile";
import { User } from "../entities/User";
import { checkAuth } from "../middleware/checkAuth";
import { S3Service } from "../services/uploader";
import { Context } from "../types/Context";
import { ProfileMutationResponse } from "../types/Profile/ProfileMutationResponse";
import { UpdateProfileInput } from "../types/Profile/UpdateProfileInput";
@Resolver((_of) => Profile)
export class ProfileResolver {
  @Mutation((_return) => ProfileMutationResponse)
  @UseMiddleware(checkAuth)
  async updateProfile(
    @Arg("avatarFile", () => GraphQLUpload)
    avatarFile: FileUpload,
    @Arg("updateProfileInput") { ...args }: UpdateProfileInput,
    @Ctx() { user }: Context
  ): Promise<ProfileMutationResponse> {
    const existingUser = await User.findOne(user.userId);

    const existingProfile = await Profile.findOne(existingUser?.profileId);

    if (!existingProfile)
      return {
        code: 400,
        success: false,
        message: "Profile not found",
      };
    const uploader = new S3Service();

    if (avatarFile) {
      try {
        const avatarRes: any = await uploader.uploadFile(avatarFile);
        existingProfile.avatar = avatarRes.Location;
      } catch (error) {
        return {
          code: 400,
          success: false,
          message: error,
        };
      }
    }

    existingProfile.about = args.about;
    existingProfile.displayName = args.displayName;
    existingProfile.gender = args.gender;
    existingProfile.country = args.country;
    existingProfile.role = args.role;
    existingProfile.company = args.company;
    existingProfile.position = args.position;
    existingProfile.phoneNumber = args.phoneNumber;
    existingProfile.facebookLink = args.facebookLink;
    existingProfile.instagramLink = args.instagramLink;
    existingProfile.twitterLink = args.twitterLink;
    existingProfile.portfolioLink = args.portfolioLink;
    existingProfile.school = args.school;

    await existingProfile.save();
    return {
      code: 200,
      success: true,
      message: "Profile updated successfully",
      profile: existingProfile,
    };
  }
}
