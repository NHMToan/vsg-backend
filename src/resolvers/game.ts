import {
  Arg,
  Ctx,
  FieldResolver,
  ID,
  Int,
  Mutation,
  Query,
  Resolver,
  Root,
  UseMiddleware,
} from "type-graphql";
import { getRepository } from "typeorm";
import { Game } from "../entities/Game";
import { Player } from "../entities/Player";
import { Round } from "../entities/Round";
import { User } from "../entities/User";
import { checkAuth } from "../middleware/checkAuth";
import { Context } from "../types/Context";
import { GameMutationResponse } from "../types/Game/GameMutationResponse";
import { CreateGameInput } from "../types/Game/Input";
import { Games } from "../types/Game/Output";

@Resolver(() => Game)
export class GameResolver {
  private gameRepository = getRepository(Game);
  private userRepository = getRepository(User);
  private playerRepository = getRepository(Player);
  private roundRepository = getRepository(Round);

  @FieldResolver((_return) => Number)
  @UseMiddleware(checkAuth)
  async roundCount(@Root() root: Game) {
    const count = await this.roundRepository.count({
      where: {
        gameId: root.id,
      },
    });

    return count || 0;
  }
  @FieldResolver((_return) => Boolean)
  @UseMiddleware(checkAuth)
  async isAuthor(@Root() root: Game, @Ctx() { user }: Context) {
    return root.createdById === user.userId;
  }
  // Query to get all games
  @Query(() => Games)
  @UseMiddleware(checkAuth)
  async games(@Ctx() { user }: Context): Promise<Games> {
    const foundGames = await this.gameRepository
      .createQueryBuilder("game")
      .leftJoinAndSelect("game.rounds", "round")
      .leftJoinAndSelect("game.createdBy", "createdBy")
      .leftJoinAndSelect("game.sharing", "sharing")
      .leftJoinAndSelect("game.players", "player")
      .orderBy("game.createdAt", "DESC")
      .where("game.createdById = :userId", { userId: user.userId })
      .orWhere("game.status = :status", { status: 1 })
      .getMany();
    return {
      totalCount: foundGames.length,
      results: foundGames,
      hasMore: false,
    };
  }

  // Query to get a single game by ID
  @Query(() => Game, { nullable: true })
  async game(@Arg("id", () => ID) id: number): Promise<Game | undefined> {
    return this.gameRepository.findOne(id, {
      relations: ["rounds", "createdBy", "sharing", "players"],
    });
  }

  // Mutation to create a new game
  @Mutation((_return) => GameMutationResponse)
  @UseMiddleware(checkAuth)
  async createGame(
    @Arg("createGameInput")
    { players }: CreateGameInput,
    @Ctx() { user }: Context
  ): Promise<GameMutationResponse> {
    try {
      const existingUser = await this.userRepository.findOne(user.userId);

      if (!existingUser) {
        return {
          code: 400,
          success: false,
          message: "User not found",
        };
      }

      const game = this.gameRepository.create({
        createdBy: existingUser,
      });
      await this.gameRepository.save(game);

      const playerEntities = await Promise.all(
        players.map(async (playerInput) => {
          const player = this.playerRepository.create({
            name: playerInput.name,
            game,
          });
          return this.playerRepository.save(player);
        })
      );

      game.players = playerEntities;

      return {
        code: 200,
        success: true,
        message: "Game created successfully",
        game: game,
      };
    } catch (error) {
      console.log(error);
      return {
        code: 500,
        success: false,
        message: `Internal server error ${error.message}`,
      };
    }
  }

  // Mutation to update the sharing users for a game
  @Mutation(() => Game)
  async updateGameSharing(
    @Arg("gameId", () => Int) gameId: number,
    @Arg("userIds", () => [Int]) userIds: number[]
  ): Promise<Game> {
    const game = await this.gameRepository.findOne(gameId, {
      relations: ["sharing"],
    });
    if (!game) {
      throw new Error("Game not found");
    }

    const users = await this.userRepository.findByIds(userIds);
    game.sharing = users;

    return this.gameRepository.save(game);
  }
  @Mutation(() => GameMutationResponse)
  @UseMiddleware(checkAuth)
  async updateGameStatus(
    @Arg("gameId", () => ID) gameId: string,
    @Arg("status", () => Int) status: number,
    @Ctx() { user }: Context
  ): Promise<GameMutationResponse> {
    try {
      const game = await this.gameRepository.findOne(gameId, {
        relations: ["createdBy"],
      });

      if (!game) {
        return {
          code: 404,
          success: false,
          message: "Game not found",
        };
      }

      if (game.createdBy.id !== user.userId) {
        return {
          code: 403,
          success: false,
          message: "Unauthorized to update this game",
        };
      }

      game.status = status;
      await this.gameRepository.save(game);

      return {
        code: 200,
        success: true,
        message: "Game status updated successfully",
        game,
      };
    } catch (error) {
      console.log(error);
      return {
        code: 500,
        success: false,
        message: `Internal server error: ${error.message}`,
      };
    }
  }
  @Mutation((_return) => GameMutationResponse)
  @UseMiddleware(checkAuth)
  async deleteGame(
    @Arg("id", (_type) => ID) id: string,
    @Ctx() { user }: Context
  ): Promise<GameMutationResponse> {
    const existingGame = await this.gameRepository.findOne(id);
    if (!existingGame)
      return {
        code: 400,
        success: false,
        message: "Game not found",
      };

    if (existingGame.createdById !== user.userId) {
      return {
        code: 403,
        success: false,
        message: "Unauthorized to delete this game",
      };
    }
    await this.gameRepository.remove(existingGame);

    return { code: 200, success: true, message: "Post deleted successfully" };
  }
}
