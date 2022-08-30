require("dotenv").config();
import {
  ApolloServerPluginDrainHttpServer,
  ApolloServerPluginLandingPageGraphQLPlayground,
} from "apollo-server-core";
import { ApolloServer } from "apollo-server-express";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { graphqlUploadExpress } from "graphql-upload";
import { useServer } from "graphql-ws/lib/use/ws";
import { createServer } from "http";
import path from "path";
import "reflect-metadata";
import { buildSchema } from "type-graphql";
import { createConnection } from "typeorm";
import { WebSocketServer } from "ws";
import { __prod__ } from "./constants";
import { Club } from "./entities/Club";
import { ClubEvent } from "./entities/ClubEvent";
import { ClubMember } from "./entities/ClubMember";
import { Comment } from "./entities/Comment";
import { Conversation } from "./entities/Conversation";
import { EventHistory } from "./entities/EventHistory";
import { Following } from "./entities/Following";
import { Friendship } from "./entities/Friendship";
import { Message } from "./entities/Message";
import { Post } from "./entities/Post";
import { Profile } from "./entities/Profile";
import { User } from "./entities/User";
import { Vote } from "./entities/Vote";
import { ConversationResolver } from "./resolvers/chat";
import { ClubResolver } from "./resolvers/club";
import { ClubMemberResolver } from "./resolvers/clubmember";
import { CommentResolver } from "./resolvers/comment";
import { ClubEventResolver } from "./resolvers/event";
import { FollowingResolver } from "./resolvers/following";
import { FriendResolver } from "./resolvers/friend";
import { GreetingResolver } from "./resolvers/greeting";
import { MessageResolver } from "./resolvers/message";
import { PostResolver } from "./resolvers/post";
import { ProfileResolver } from "./resolvers/profile";
import { UserResolver } from "./resolvers/user";
import { VoteResolver } from "./resolvers/vote";
import refreshTokenRouter from "./routes/refreshTokenRouter";
import { Context } from "./types/Context";
import { buildDataLoaders } from "./utils/dataLoaders";

const main = async () => {
  const connection = await createConnection({
    type: "postgres",
    ...(__prod__
      ? {
          url: process.env.DATABASE_URL,
          extra: {
            ssl: {
              rejectUnauthorized: false,
            },
          },
          ssl: true,
        }
      : {
          database: __prod__ ? process.env.DB_NAME_PROD : process.env.DB_NAME,
          username: __prod__
            ? process.env.DB_USERNAME_PROD
            : process.env.DB_USERNAME,
          password: __prod__
            ? process.env.DB_PASSWORD_PROD
            : process.env.DB_PASSWORD,
          synchronize: true,
        }),
    logging: true,
    entities: [
      User,
      Post,
      Profile,
      Comment,
      Following,
      Friendship,
      Conversation,
      Message,
      Club,
      ClubMember,
      EventHistory,
      ClubEvent,
      Vote,
    ],
    migrations: [path.join(__dirname, "/migrations/*")],
  });
  if (__prod__) await connection.runMigrations();

  const app = express();

  app.use(
    cors({
      origin: [
        "http://localhost:3000",
        "https://www.vietsportmates.top",
        "https://vietsportmates.top",
      ],
      credentials: true,
    })
  );
  app.use(cookieParser());

  app.use("/refresh_token", refreshTokenRouter);

  const httpServer = createServer(app);

  const schema = await buildSchema({
    validate: false,
    resolvers: [
      GreetingResolver,
      UserResolver,
      PostResolver,
      ProfileResolver,
      CommentResolver,
      FollowingResolver,
      FriendResolver,
      ConversationResolver,
      MessageResolver,
      ClubResolver,
      ClubMemberResolver,
      ClubEventResolver,
      VoteResolver,
      GreetingResolver,
    ],
  });
  const wsServer = new WebSocketServer({
    server: httpServer,
    path: "/subscriptions",
  });

  const serverCleanup = useServer({ schema }, wsServer);

  const myPlugin = {
    async serverWillStart() {
      return {
        async drainServer() {
          await serverCleanup.dispose();
        },
      };
    },
  };
  const apolloServer = new ApolloServer({
    schema,
    plugins: [
      ApolloServerPluginDrainHttpServer({ httpServer }),
      ApolloServerPluginLandingPageGraphQLPlayground,
      myPlugin,
    ],
    context: ({
      req,
      res,
    }): Pick<Context, "req" | "res" | "connection" | "dataLoaders"> => ({
      req,
      res,
      connection,
      dataLoaders: buildDataLoaders(),
    }),
  });

  await apolloServer.start();

  app.use(graphqlUploadExpress({ maxFileSize: 10000000, maxFiles: 10 }));

  apolloServer.applyMiddleware({
    app,
    cors: {
      origin: [
        "http://localhost:3000",
        "https://vietsportmates.top",
        "https://www.vietsportmates.top",
      ],
      credentials: true,
    },
  });

  const PORT = process.env.PORT || 4000;

  await new Promise((resolve) =>
    httpServer.listen({ port: PORT }, resolve as () => void)
  );

  // Typically, http://localhost:4000/graphql
  console.log(
    `SERVER STARTED ON PORT ${PORT}. GRAPHQL ENDPOINT ON http://localhost:${PORT}${apolloServer.graphqlPath}`
  );
  console.log(
    `🚀 Subscription endpoint ready at ws://localhost:${PORT}${apolloServer.graphqlPath}`
  );
};

main().catch((error) => console.log("ERROR STARTING SERVER: ", error));
