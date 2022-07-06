import { Query, Resolver } from "type-graphql";

@Resolver()
export class GreetingResolver {
  @Query((_return) => String)
  async hello(): Promise<string> {
    return "Hello World";
  }
}
