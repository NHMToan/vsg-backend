import {
  Arg,
  Ctx,
  ID,
  Int,
  Mutation,
  PubSub,
  PubSubEngine,
  Query,
  Resolver,
  Root,
  Subscription,
  UseMiddleware,
} from "type-graphql";
import { getRepository } from "typeorm";
import { Game } from "../entities/Game";
import { Player } from "../entities/Player";
import { Round } from "../entities/Round";
import { Score } from "../entities/Score";
import { checkAuth } from "../middleware/checkAuth";
import { Context } from "../types/Context";
import { PlayerScoreInput } from "../types/Game/Input";
import { RoundMutationResponse } from "../types/Game/RoundMutationResponse";

@Resolver(() => Round)
export class RoundResolver {
  private roundRepository = getRepository(Round);
  private gameRepository = getRepository(Game);
  private scoreRepository = getRepository(Score);
  private playerRepository = getRepository(Player);

  @Query(() => [Round])
  async rounds(): Promise<Round[]> {
    return this.roundRepository.find({
      relations: ["game", "scores", "scores.player"],
      order: {
        createdAt: "DESC",
      },
    });
  }

  @Query(() => Round, { nullable: true })
  async round(@Arg("id", () => Int) id: number): Promise<Round | undefined> {
    return this.roundRepository.findOne(id, {
      relations: ["game", "scores", "scores.player"],
    });
  }

  @Mutation(() => RoundMutationResponse)
  @UseMiddleware(checkAuth)
  async createRound(
    @Arg("gameId", () => ID) gameId: string,
    @Arg("scores", () => [PlayerScoreInput]) scores: PlayerScoreInput[],
    @Ctx() { user }: Context,
    @PubSub() pubSub: PubSubEngine
  ): Promise<RoundMutationResponse> {
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
          message: "Unauthorized to create round for this game",
        };
      }

      const round = this.roundRepository.create({ game });
      await this.roundRepository.save(round);

      const scoreEntities = scores.map(async (scoreInput) => {
        const player = await this.playerRepository.findOne(scoreInput.playerId);
        if (!player) {
          throw new Error(`Player with ID ${scoreInput.playerId} not found`);
        }
        const score = this.scoreRepository.create({
          points: scoreInput.points,
          player,
          round,
        });
        return this.scoreRepository.save(score);
      });

      round.scores = await Promise.all(scoreEntities);
      await this.roundRepository.save(round);

      // Publish the update
      const updatedRounds = await this.roundRepository.find({
        where: { game: { id: gameId } },
        relations: ["game", "scores", "scores.player"],
        order: {
          createdAt: "DESC",
        },
      });
      await pubSub.publish("ROUND_UPDATED", { gameId, rounds: updatedRounds });

      return {
        code: 200,
        success: true,
        message: "Round created successfully",
        round,
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

  @Mutation(() => RoundMutationResponse)
  @UseMiddleware(checkAuth)
  async updateRound(
    @Arg("roundId", () => ID) roundId: string,
    @Arg("scores", () => [PlayerScoreInput]) scores: PlayerScoreInput[],
    @Ctx() { user }: Context,
    @PubSub() pubSub: PubSubEngine
  ): Promise<RoundMutationResponse> {
    try {
      const round = await this.roundRepository.findOne(roundId, {
        relations: ["game", "game.createdBy", "scores", "scores.player"],
      });

      if (!round) {
        return {
          code: 404,
          success: false,
          message: "Round not found",
        };
      }

      if (round.game.createdBy.id !== user.userId) {
        return {
          code: 403,
          success: false,
          message: "Unauthorized to update this round",
        };
      }

      // Remove existing scores
      await this.scoreRepository.remove(round.scores);

      // Create new scores
      const scoreEntities = await Promise.all(
        scores.map(async (scoreInput) => {
          const player = await this.playerRepository.findOne(
            scoreInput.playerId
          );
          if (!player) {
            throw new Error(`Player with ID ${scoreInput.playerId} not found`);
          }
          const score = this.scoreRepository.create({
            points: scoreInput.points,
            player,
            round,
          });
          return this.scoreRepository.save(score);
        })
      );

      round.scores = scoreEntities;
      await this.roundRepository.save(round);

      // Publish the update
      const updatedRounds = await this.roundRepository.find({
        where: { game: { id: round.game.id } },
        relations: ["game", "scores", "scores.player"],
        order: {
          createdAt: "DESC",
        },
      });
      await pubSub.publish("ROUND_UPDATED", {
        gameId: round.game.id,
        rounds: updatedRounds,
      });

      return {
        code: 200,
        success: true,
        message: "Round updated successfully",
        round,
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

  @Mutation(() => RoundMutationResponse)
  @UseMiddleware(checkAuth)
  async deleteRound(
    @Arg("roundId", () => ID) roundId: string,
    @Ctx() { user }: Context,
    @PubSub() pubSub: PubSubEngine
  ): Promise<RoundMutationResponse> {
    try {
      const round = await this.roundRepository.findOne(roundId, {
        relations: ["game", "game.createdBy", "scores"],
      });

      if (!round) {
        return {
          code: 404,
          success: false,
          message: "Round not found",
        };
      }

      if (round.game.createdBy.id !== user.userId) {
        return {
          code: 403,
          success: false,
          message: "Unauthorized to delete this round",
        };
      }

      await this.scoreRepository.remove(round.scores);
      await this.roundRepository.remove(round);

      // Publish the update
      const updatedRounds = await this.roundRepository.find({
        where: { game: { id: round.game.id } },
        relations: ["game", "scores", "scores.player"],
        order: {
          createdAt: "DESC",
        },
      });
      await pubSub.publish("ROUND_UPDATED", {
        gameId: round.game.id,
        rounds: updatedRounds,
      });

      return {
        code: 200,
        success: true,
        message: "Round deleted successfully",
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

  @Query(() => [Round])
  async roundsOfGame(
    @Arg("gameId", () => ID) gameId: string
  ): Promise<Round[]> {
    return this.roundRepository.find({
      where: { game: { id: gameId } },
      relations: ["game", "scores", "scores.player"],
      order: {
        createdAt: "DESC",
      },
    });
  }

  @Subscription(() => [Round], {
    topics: "ROUND_UPDATED",
    filter: ({ payload, args }) => payload.gameId === args.gameId,
  })
  roundsOfGameSubscription(
    @Arg("gameId", () => ID) gameId: string,
    @Root() payload: { gameId: string; rounds: Round[] }
  ): Round[] {
    console.log(gameId);
    return payload.rounds;
  }
}
