import * as fs from "fs";
import * as path from "path";

import * as jwt from "jsonwebtoken";
import * as express from "express";
import * as cors from "cors";
import { Client } from "pg";
import { Db, MongoClient, ObjectId } from "mongodb";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";

import { HostedTripResolver, MutationResolver, NotificationResolver, QueryResolver, RequestedTripResolver, ScalarResolver, TripBillingResolver } from "../graphql/resolver";
import { DB_MONGO, DB_POSTGRES, HOST_POSTGRES, PASSWORD_POSTGRES, PORT_EXPRESS, PORT_POSTGRES, SECRET_JWT, URL_MONGO, USER_POSTGRES } from "../../config";
import * as In from "../graphql/internal";
import { Context, JwtValue } from "./interface";
import { NominatimResolver, OsrmResolver } from "../rest/resolver";

export class Server {
    static readonly postgresDriver = new Client({
        host: HOST_POSTGRES,
        user: USER_POSTGRES,
        password: PASSWORD_POSTGRES,
        database: DB_POSTGRES,
        port: PORT_POSTGRES,
    });
    private static readonly mongoDriver = new MongoClient(URL_MONGO);
    static db: Db;
    static readonly express = express();
    static readonly appolo = new ApolloServer({
        includeStacktraceInErrorResponses: false,
        typeDefs: fs.readFileSync(path.resolve(__dirname + "/../graphql/external.graphql"), "utf-8"),
        resolvers: {
            ObjectId: ScalarResolver.ObjectId,
            Date: ScalarResolver.Date,
            Query: QueryResolver,
            Mutation: MutationResolver,
            HostedTrip: HostedTripResolver,
            TripBilling: TripBillingResolver,
            RequestedTrip: RequestedTripResolver,
            Notification: NotificationResolver,
        }
    });

    static async connectDatabaseDrivers() {
        await this.mongoDriver.connect();
        this.db = this.mongoDriver.db(DB_MONGO);
        console.log({
            component: "MongoDB Driver",
            status: true,
            database: DB_MONGO
        });

        await this.postgresDriver.connect();
        console.log({
            component: "PostgreSQL Driver",
            status: true,
            database: DB_MONGO
        });
    }

    static async start() {
        await this.appolo.start();

        //Bind Apollo server
        this.express.use("/graphql", cors(), express.json(), expressMiddleware(this.appolo, {
            context: async ({ req, res }): Promise<Context> => {
                //Get JWT token from the header or make it empty
                const token = req.headers.authorization || "";

                try {
                    const result = jwt.verify(token, SECRET_JWT) as JwtValue;

                    //Retrieve the user and their role based on the JWT token
                    const user = await Server.db.collection<In.User>("users").findOne({ _id: new ObjectId(result.userId) }) as In.User;

                    //Add the user and their role to the context
                    return { user };
                } catch(err) {
                    console.error(err);
                    return { user: null };
                }
            }
        }));

        //Bind static assets
        this.express.use("/", express.static("public"));

        //Bind OSRM
        this.express.use("/osrm/route/v1/driving/:keyCoords", OsrmResolver.calculatePossibleRoutes);

        //Bind Nominatim
        this.express.use("/nominatim/search", NominatimResolver.searchForCoords);

        this.express.listen(PORT_EXPRESS, () => {
            console.log({
                component: "Server",
                status: true,
                port: PORT_EXPRESS,
                cwd: __dirname
            });
        });
    }
}