import { Ctx, Query, Resolver, UseMiddleware } from "type-graphql";
import { User } from "../entities/User";
import { checkAuth } from "../middleware/checkAuth";
import { Context } from "../types/Context";

@Resolver()
export class GreetingResolver {
  @Query((_return) => String)
  @UseMiddleware(checkAuth)
  async hello(@Ctx() { user }: Context): Promise<string> {
    const existingUser = await User.findOne(user.userId);
    return `Hello ${existingUser ? existingUser.lastName : "World"}`;
  }
}
