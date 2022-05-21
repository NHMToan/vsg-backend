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
import { createServer } from "http";
import path from "path";
import "reflect-metadata";
import { buildSchema } from "type-graphql";
import { createConnection } from "typeorm";
import { __prod__ } from "./constants";
import { Comment } from "./entities/Comment";
import { Post } from "./entities/Post";
import { Profile } from "./entities/Profile";
import { User } from "./entities/User";
import { CommentResolver } from "./resolvers/comment";
import { GreetingResolver } from "./resolvers/greeting";
import { PostResolver } from "./resolvers/post";
import { ProfileResolver } from "./resolvers/profile";
import { UserResolver } from "./resolvers/user";
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
          database: "my-oneapp-dev",
          username: process.env.DB_USERNAME,
          password: process.env.DB_PASSWORD,
          synchronize: true,
        }),
    logging: true,
    entities: [User, Post, Profile, Comment],
    migrations: [path.join(__dirname, "/migrations/*")],
  });
  if (__prod__) await connection.runMigrations();

  const app = express();

  app.use(
    cors({
      origin: __prod__
        ? process.env.CORS_ORIGIN_PROD
        : process.env.CORS_ORIGIN_DEV,
      credentials: true,
    })
  );
  app.use(cookieParser());

  app.use("/refresh_token", refreshTokenRouter);

  const httpServer = createServer(app);

  const apolloServer = new ApolloServer({
    schema: await buildSchema({
      validate: false,
      resolvers: [
        GreetingResolver,
        UserResolver,
        PostResolver,
        ProfileResolver,
        CommentResolver,
      ],
    }),
    plugins: [
      ApolloServerPluginDrainHttpServer({ httpServer }),
      ApolloServerPluginLandingPageGraphQLPlayground,
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
      origin: __prod__
        ? process.env.CORS_ORIGIN_PROD
        : process.env.CORS_ORIGIN_DEV,
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
};

main().catch((error) => console.log("ERROR STARTING SERVER: ", error));
