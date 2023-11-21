import * as fs from "fs";
import * as path from "path";

import * as jwt from "jsonwebtoken";
import * as express from "express";
import * as cors from "cors";
import { Db, MongoClient, ObjectId } from "mongodb";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";

import { HostedTripResolver, MutationResolver, PermissionResolver, QueryResolver, RequestedTripResolver, ScalarResolver, TripBillingResolver } from "../graphql/resolver";
import { NAME_DB, PORT_EXPRESS, SECRET_JWT, URL_DB_MONGO } from "../config";
import { Role, User } from "../graphql/internal";
import { Context } from "./interface";

export class Server {
    private static readonly dbDriver = new MongoClient(URL_DB_MONGO);
    static db: Db;
    static readonly express = express();
    static readonly appolo = new ApolloServer({
        typeDefs: fs.readFileSync(path.resolve(__dirname + "/../graphql/external.graphql"), "utf-8"),
        resolvers: {
            ObjectId: ScalarResolver.ObjectId,
            Date: ScalarResolver.Date,
            Query: QueryResolver,
            Mutation: MutationResolver,
            Permission: PermissionResolver,
            HostedTrip: HostedTripResolver,
            TripBilling: TripBillingResolver,
            RequestedTrip: RequestedTripResolver,
        }
    });

    static async connectToDatabase() {
        await this.dbDriver.connect();
        this.db = this.dbDriver.db(NAME_DB);
        console.log({
            component: "Database Driver",
            status: true,
            database: NAME_DB
        });
    }

    static async start() {
        await this.appolo.start();

        this.express.use("/graphql", cors(), express.json(), expressMiddleware(this.appolo, {
            context: async ({ req, res }): Promise<Context> => {
                //Get JWT token from the header or make it empty
                const token = req.headers.authorization || "";

                try {
                    const result = jwt.verify(token, SECRET_JWT) as any;

                    //Retrieve the user and their role based on the JWT token
                    const user = await Server.db.collection<User>("users").findOne({ _id: new ObjectId(result.userId) }) as User;
                    user.role = await Server.db.collection<Role>("roles").findOne({ _id: user.roleId }) as Role;

                    //Add the user and their role to the context
                    return { user };
                } catch(err) {
                    console.error(err);
                    return { user: null };
                }
            }
        }));

        this.express.use("/", express.static("public"));

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