import * as fs from "node:fs";
import * as path from "node:path";

import express from "express";
import cors from "cors";
import redis from "redis";
import JWTR from "jwt-redis";
import pg from "pg";
import { Db, MongoClient, ObjectId } from "mongodb";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import gqlConstraint from "graphql-constraint-directive/apollo4.js";

import * as Config from "../../config.js";
import * as In from "../graphql/internal.js";
import { Context, JwtPayload } from "./interface.js";
import { osrm, nominatim } from "../rest/resolver.js";
import { scalar, root, type } from "../graphql/resolver.js";

export class Server {
    static readonly cwd = new URL(".", import.meta.url).pathname;

    //PostgresSQL
    static readonly postgresDriver = new pg.Client({
        host: Config.HOST_POSTGRES,
        user: Config.USER_POSTGRES,
        password: Config.PASSWORD_POSTGRES,
        database: Config.DB_POSTGRES,
        port: Config.PORT_POSTGRES,
    });

    //MongoDB
    private static readonly mongoDriver = new MongoClient(Config.URL_MONGO);
    static db: Db;

    //Redis & Jwtr
    private static readonly redisDriver = redis.createClient();
    static jwtr: any = null;

    //Express
    static readonly express = express();

    //Apollo
    static readonly apollo = new ApolloServer({
        includeStacktraceInErrorResponses: false,
        typeDefs: [gqlConstraint.constraintDirectiveTypeDefsGql, fs.readFileSync(path.resolve(this.cwd + "/../graphql/external.graphql"), "utf-8")],
        resolvers: {
            ...scalar,
            ...root,
            ...type
        },
        plugins: [
            //@ts-ignore
            gqlConstraint.createApollo4QueryValidationPlugin({})
        ]
    });

    static async connectMongoDriver() {
        try {
            await this.mongoDriver.connect();
            this.db = this.mongoDriver.db(Config.DB_MONGO);
            console.log({
                component: "MongoDB Driver",
                status: true,
                database: Config.DB_MONGO
            });
        } catch (err: any) {
            console.error({
                component: "MongoDB Driver",
                status: false,
                error: err.message
            });
            throw err;
        }
    }

    static async connectPostgresDriver() {
        try {
            await this.postgresDriver.connect();
            console.log({
                component: "PostgreSQL Driver",
                status: true,
                database: Config.DB_POSTGRES
            });
        } catch (err: any) {
            console.error({
                component: "PostgreSQL Driver",
                status: false,
                error: err.message
            });
            throw err;
        }
    }

    static async startAuthenticator() {
        try {
            await this.redisDriver.connect();
            //@ts-ignore
            this.jwtr = new JWTR.default(this.redisDriver);
            console.log({
                component: "Redis Driver",
                status: true,
                database: Config.DB_POSTGRES
            });
        } catch (err: any) {
            console.error({
                component: "Redis Driver",
                status: false,
                error: err
            });
            throw err;
        }
    }

    private static async bindRoutes() {
        await this.apollo.start();

        //Bind Apollo server
        this.express.use("/graphql", cors(), express.json(), expressMiddleware(this.apollo, {
            context: async ({ req, res }): Promise<Context> => {
                //Get JWT token from the header or make it empty
                const token = req.headers.authorization || "";

                try {
                    const result = await this.jwtr.verify(token, Config.SECRET_JWT) as JwtPayload;

                    //Retrieve the user and their role based on the JWT token
                    const user = await Server.db.collection<In.User>("users").findOne({
                        _id: new ObjectId(result.userId)
                    }) as In.User;

                    //Add the user and their role to the context
                    return { user };
                } catch (err: any) {
                    return { user: null };
                }
            }
        }));

        //Bind static assets
        this.express.use("/", express.static("public"));

        //Bind OSRM
        this.express.use("/osrm/route/v1/driving/:keyCoords", osrm.CalculatePossibleRoutes);

        //Bind Nominatim
        this.express.use("/nominatim/search", nominatim.SearchForCoords);
    }

    static async start() {
        await this.bindRoutes();

        this.express.listen(Config.PORT_EXPRESS, () => {
            console.log({
                component: "Server",
                status: true,
                port: Config.PORT_EXPRESS,
                cwd: this.cwd
            });
        });
    }
}