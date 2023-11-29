import * as crypto from "crypto";

import * as jwt from "jsonwebtoken";
import fetch from "node-fetch";
import { ObjectId } from "mongodb";
import { GraphQLError, GraphQLScalarType, Kind } from "graphql";

import * as Config from "../../config";
import * as Default from "../lib/default";
import * as Error from "../lib/error";
import * as In from "./internal";
import * as Ex from "./external";
import { Server } from "../lib/app";
import { ModuleId, OperationIndex } from "../lib/enum";
import { JwtPayload, Resolver } from "../lib/interface";
import { PermissionManager, PostGIS } from "../lib/util";

export const scalar = {
    ObjectId: new GraphQLScalarType<ObjectId | null, string>({
        name: "ObjectId",
        description: "The GraphQL frontend for BSON.ObjectId from MongoDB",
        serialize(value) {
            if (value instanceof ObjectId) {
                return value.toHexString();
            }
            throw new GraphQLError(`Error serializing "${value}" from ObjectId`);
        },
        parseValue(value) {
            if (typeof value === "string") {
                return new ObjectId(value);
            }
            throw new GraphQLError(`Error parsing "${value}" to ObjectId`);
        },
        parseLiteral(valueNode) {
            if (valueNode.kind === Kind.STRING) {
                return new ObjectId(valueNode.value)
            }
            return null;
        }
    }),

    Date: new GraphQLScalarType<Date | null, number>({
        name: "Date",
        description: "Date custom scalar type",
        serialize(value) {
            if (value instanceof Date) {
                return value.getTime();
            }
            throw new GraphQLError(`Error serializing "${value}" from Date`);
        },
        parseValue(value) {
            if (typeof value === "number") {
                return new Date(value);
            }
            throw new GraphQLError(`Error parsing "${value}" to Date`);
        },
        parseLiteral(ast) {
            if (ast.kind === Kind.INT) {
                return new Date(parseInt(ast.value, 10));
            }
            return null;
        },
    }),
}

export const root: {
    Query: Resolver<In.Query, Ex.Query>,
    Mutation: Resolver<In.Mutation, Ex.Mutation>,
} = {
    Query: {
        GetMe: async (parent, args, ctx, info) => {
            //WARNING: GetMe doesn't need any permission validation
            return PermissionManager.me(ctx);
        },

        GetMyVehicles: async (parent, args, ctx, info) => {
            await PermissionManager.query(ctx.user, ModuleId.VEHICLES, OperationIndex.RETRIEVE);
            const me = PermissionManager.me(ctx);
            return await Server.db.collection<In.Vehicle>("vehicles").find({ ownerId: me._id }).toArray();
        },

        GetMyBankAccounts: async (parent, args, ctx, info) => {
            await PermissionManager.query(ctx.user, ModuleId.BANK_ACCOUNTS, OperationIndex.RETRIEVE);
            const me = PermissionManager.me(ctx);
            return await Server.db.collection<In.BankAccount>("bankAccounts").find({ ownerId: me._id }).toArray();
        },

        GetMyHostedTrips: async (parent, args, ctx, info) => {
            await PermissionManager.query(ctx.user, ModuleId.HOSTED_TRIPS, OperationIndex.RETRIEVE);
            const me = PermissionManager.me(ctx);
            return await Server.db.collection<In.HostedTrip & Ex.HostedTrip>("hostedTrips").find({
                hostId: me._id
            }).toArray();
        },

        GetMyRequestedTrips: async (parent, args, ctx, info) => {
            await PermissionManager.query(ctx.user, ModuleId.REQUESTED_TRIPS, OperationIndex.RETRIEVE);
            const me = PermissionManager.me(ctx);
            return await Server.db.collection<In.RequestedTrip & Ex.RequestedTrip>("requestedTrips").find({
                requesterId: me._id
            }).toArray();
        },

        GetMySentHandshakes: async (parent, args, ctx, info) => {
            await PermissionManager.query(ctx.user, ModuleId.HANDSHAKES, OperationIndex.RETRIEVE);
            const me = PermissionManager.me(ctx);
            return await Server.db.collection<In.Handshake & Ex.Handshake>("handshakes").find({
                senderId: me._id
            }).toArray();
        },

        GetMyReceivedHandshakes: async (parent, args, ctx, info) => {
            await PermissionManager.query(ctx.user, ModuleId.HANDSHAKES, OperationIndex.RETRIEVE);
            const me = PermissionManager.me(ctx);
            return await Server.db.collection<In.Handshake & Ex.Handshake>("handshakes").find({
                recipientId: me._id
            }).toArray();
        },

        GetMatchingRequestedTrips: async (parent, args: Ex.QueryGetMatchingRequestedTripsArgs, ctx, info) => {
            await PermissionManager.query(ctx.user, ModuleId.REQUESTED_TRIPS, OperationIndex.RETRIEVE);

            const hostedTrip = await Server.db.collection<In.HostedTrip & Ex.HostedTrip>("hostedTrips").findOne({
                _id: args.hostedTripId
            });
            
            if (!hostedTrip) {
                throw new Error.ItemDoesNotExist("hosted trip", "id", args.hostedTripId.toHexString());
            }

            //Validate if hosted trip's host is current user
            if (hostedTrip.hostId !== ctx.user?._id) {
                throw new Error.ItemNotAccessibleByUser("hosted trip", "id", args.hostedTripId.toHexString());
            }

            //Validate if hosted trip is not expired
            if (hostedTrip.time.end) {
                throw new Error.ItemIsNotActive("hosted trip", "id", args.hostedTripId.toHexString());
            }

            const hostedTripPolyLines = hostedTrip.route.polyLines!;
            const requestedTripMatches: Ex.RequestedTripMatch[] = [];

            //DANGER//TODO: Must me optimized. Find a better way than retrieving all requested trips 
            //Get all requested trips
            const requestedTrips = await Server.db.collection<In.RequestedTrip & Ex.RequestedTrip>("requestedTrips").find({
                //Filter requested trips that are +-1h to hosted trip
                "time.schedule": {
                    $gte: hostedTrip.time.schedule.getHours() - 1,
                    $lt: hostedTrip.time.schedule.getHours() + 1
                }
            }).toArray();

            //For each requested trip, calculate match results
            for (const requestedTrip of requestedTrips) {
                //Query all possible routes of the requested trip using OSRM
                const routes = await fetch(`${Config.URL_OSRM}/${requestedTrip.route.keyCoords?.map(keyCoord => keyCoord.join(",")).join(";")}?overview=false&steps=true`)
                    .then((res: any) => res.json())
                    .then((res: any) => res.routes);

                const tripMatchResults: Ex.TripMatchResult[] = [];

                //For each possible route calculate trip match result
                for (const route of routes) {
                    const requestedTripPolyLines: string[] = [];
                    for (const step of route.legs[0].steps) {
                        requestedTripPolyLines.push(step.geometry);
                    }

                    const tripMatchResult = await PostGIS.calculateRouteMatchResult(hostedTripPolyLines, requestedTripPolyLines);

                    tripMatchResults.push({
                        hostedTripLength: tripMatchResult.mainRouteLength,
                        requestedTripLength: tripMatchResult.secondaryRouteLength,
                        hostedTripCoverage: tripMatchResult.mainRouteCoverage,
                        requestedTripCoverage: tripMatchResult.secondaryRouteCoverage,
                        intersectionLength: tripMatchResult.intersectionLength,
                        intersectionPolyLine: tripMatchResult.intersectionPolyLine
                    });
                }

                requestedTripMatches.push({
                    hostedTrip: hostedTrip,
                    requestedTrip: requestedTrip,
                    results: tripMatchResults
                });
            }

            return requestedTripMatches;
        },
    },

    Mutation: {
        CreateUser: async (parent, args: Ex.MutationCreateUserArgs, ctx, info) => {
            await PermissionManager.query(ctx.user, ModuleId.USERS, OperationIndex.CREATE);

            const result = await Server.db.collection<In.UserInput>("users").insertOne({
                ...args.user,
                isActive: true,
                roleId: new ObjectId(Default.ID_ROLE),
                rating: {
                    driving: 0.0,
                    politeness: 0.0,
                    punctuality: 0.0,
                },
                secret: {
                    hash: crypto.createHash("sha1").update(args.user.password).digest("hex")
                }
            });

            if (!result.acknowledged) {
                throw new Error.CouldNotPerformOperation(ModuleId.USERS, OperationIndex.CREATE);
            }
            return result.insertedId;
        },

        SignIn: async (parent, args: Ex.MutationSignInArgs, ctx, info) => {
            const item = await Server.db.collection<In.User>("users").findOne({ mobile: args.mobile });

            if (!item) {
                throw new Error.ItemDoesNotExist("user", "mobile", args.mobile);
            }

            if (!item.isActive) {
                throw new Error.ItemIsNotActive("user", "mobile", args.mobile);
            }

            const generatedHash = crypto.createHash("sha1").update(args.password).digest("hex");
            if (generatedHash !== item.secret!.hash) {
                throw new Error.PasswordMismatch(args.mobile);
            }

            return jwt.sign(
                { userId: item._id.toHexString()} as JwtPayload,
                Config.SECRET_JWT,
                { expiresIn: "7d" }
            );
        },

        CreateHostedTrip: async (parent, args: Ex.MutationCreateHostedTripArgs, ctx, info) => {
            await PermissionManager.query(ctx.user, ModuleId.HOSTED_TRIPS, OperationIndex.CREATE);

            const tripToBeInserted: In.HostedTripInput = {
                ...args.hostedTrip,
                vehicle: undefined
            };

            //Validate vehicleId and vehicle
            if (args.hostedTrip.vehicleId) {
                //CASE: User has assigned a saved vehicle
                //Validate vehicle
                const vehicle = await Server.db.collection<In.Vehicle & Ex.Vehicle>("vehicles").findOne({
                    _id: args.hostedTrip.vehicleId
                });

                if (!vehicle) {
                    throw new Error.ItemDoesNotExist("vehicle", "id", args.hostedTrip.vehicleId.toHexString());
                }

                if (!vehicle.isActive) {
                    throw new Error.ItemIsNotActive("vehicle", "id", args.hostedTrip.vehicleId.toHexString());
                }

                tripToBeInserted.vehicleId = args.hostedTrip.vehicleId;
            } else if (args.hostedTrip.vehicle) {
                //CASE: User has assigned a temporary vehicle
                tripToBeInserted.vehicle = {
                    ...args.hostedTrip.vehicle,
                    isActive: true,
                }
            } else {
                //CASE: User hasn't provided any vehicleId or vehicle
                throw new Error.InvalidFieldValue("hosted trip", "vehicleId", "null");
            }

            //Validate bank account
            const bankAccount = await Server.db.collection<In.BankAccount & Ex.BankAccount>("bankAccounts").findOne({ _id: args.hostedTrip.billing.bankAccountId });

            if (!bankAccount) {
                throw new Error.ItemDoesNotExist("bank account", "id", args.hostedTrip.billing.bankAccountId.toHexString());
            }

            if (!bankAccount.isActive) {
                throw new Error.ItemIsNotActive("bank account", "id", args.hostedTrip.billing.bankAccountId.toHexString());
            }

            const result = await Server.db.collection<In.HostedTripInput>("hostedTrips").insertOne(tripToBeInserted);
            if (!result.acknowledged) {
                throw new Error.CouldNotPerformOperation(ModuleId.HOSTED_TRIPS, OperationIndex.CREATE);
            }

            return result.insertedId;
        }
    },
}

export const type: {
    HostedTrip: Resolver<In.HostedTrip, Ex.HostedTrip>,
    TripBilling: Resolver<In.TripBilling, Ex.TripBilling>,
    RequestedTrip: Resolver<In.RequestedTrip, Ex.RequestedTrip>,
    Handshake: Resolver<In.Handshake, Ex.Handshake>,
} = {
    HostedTrip: {
        _id: async (parent, args, ctx, info) => parent._id,

        host: async (parent, args, ctx, info) => {
            await PermissionManager.query(ctx.user, ModuleId.USERS, OperationIndex.RETRIEVE);
            const item = await Server.db.collection<In.User>("users").findOne({ _id: parent.hostId });

            if (!item) {
                throw new Error.ItemDoesNotExist("user/host", "id", args.id.toHexString());
            }

            return item;
        },

        route: async (parent, args, ctx, info) => parent.route,

        time: async (parent, args, ctx, info) => parent.time,

        vehicle: async (parent, args, ctx, info) => {
            if (parent.vehicleId) {
                //CASE: vehicleId exists.
                //User has assigned a saved vehicle. It must be retrieved from database
                await PermissionManager.query(ctx.user, ModuleId.VEHICLES, OperationIndex.RETRIEVE);
                const item = await Server.db.collection<In.Vehicle & Ex.Vehicle>("vehicles").findOne({
                    _id: parent.vehicleId
                });

                if (!item) {
                    throw new Error.ItemDoesNotExist("vehicle", "id", args.id.toHexString());
                }

                return item;
            } else {
                //CASE: vehicleId doesn't exists.
                //User has assigned a temporary vehicle. It must be available as an embedded document
                return parent.vehicle as Ex.Vehicle;
            }
        },

        seats: async (parent, args, ctx, info) => parent.seats,

        billing: async (parent, args, ctx, info) => parent.billing,
    },

    TripBilling: {
        bankAccount: async (parent, args, ctx, info) => {
            await PermissionManager.query(ctx.user, ModuleId.BANK_ACCOUNTS, OperationIndex.RETRIEVE);
            const item = await Server.db.collection<In.BankAccount>("bankAccounts").findOne({
                _id: parent.bankAccountId
            });

            if (!item) {
                throw new Error.ItemDoesNotExist("bank account", "id", args.id.toHexString());
            }
            
            return item;
        },

        priceFirstKm: async (parent, args, ctx, info) => parent.priceFirstKm,

        priceNextKm: async (parent, args, ctx, info) => parent.priceNextKm,
    },

    RequestedTrip: {
        _id: async (parent, args, ctx, info) => parent._id,

        requester: async (parent, args, ctx, info) => {
            await PermissionManager.query(ctx.user, ModuleId.USERS, OperationIndex.RETRIEVE);
            const item = await Server.db.collection<In.User & Ex.User>("users").findOne({
                _id: parent.requesterId
            });

            if (!item) {
                throw new Error.ItemDoesNotExist("user/requester", "id", args.id.toHexString());
            }

            return item;
        },

        route: async (parent, args, ctx, info) => parent.route,

        time: async (parent, args, ctx, info) => parent.time,

        seats: async (parent, args, ctx, info) => parent.seats,
    },

    Handshake: {
        _id: async (parent, args, ctx, info) => parent._id,

        sender: async (parent, args, ctx, info) => {
            await PermissionManager.query(ctx.user, ModuleId.USERS, OperationIndex.RETRIEVE);
            const item = await Server.db.collection<In.User>("users").findOne({ _id: parent.senderId });

            if (!item) {
                throw new Error.ItemDoesNotExist("user/sender", "id", args.id.toHexString());
            }
            
            return item;
        },

        recipient: async (parent, args, ctx, info) => {
            await PermissionManager.query(ctx.user, ModuleId.USERS, OperationIndex.RETRIEVE);
            const item = await Server.db.collection<In.User>("users").findOne({ _id: parent.recipientId });

            if (!item) {
                throw new Error.ItemDoesNotExist("user/recipient", "id", args.id.toHexString());
            }
            
            return item;
        },

        hostedTrip: async (parent, args, ctx, info) => {
            await PermissionManager.query(ctx.user, ModuleId.HOSTED_TRIPS, OperationIndex.RETRIEVE);
            const item = await Server.db.collection<In.HostedTrip & Ex.HostedTrip>("hostedTrips").findOne({
                _id: parent.hostedTripId
            });

            if (!item) {
                throw new Error.ItemDoesNotExist("hosted trip", "id", args.id.toHexString());
            }

            return item;
        },

        requestedTrip: async (parent, args, ctx, info) => {
            await PermissionManager.query(ctx.user, ModuleId.REQUESTED_TRIPS, OperationIndex.RETRIEVE);
            const item = await Server.db.collection<In.RequestedTrip & Ex.RequestedTrip>("requestedTrips").findOne({
                _id: parent.requestedTripId
            });

            if (!item) {
                throw new Error.ItemDoesNotExist("requested trip", "id", args.id.toHexString());
            }
            
            return item;
        },

        time: async (parent, args, ctx, info) => parent.time,

        payment: async (parent, args, ctx, info) => parent.payment,

        rating: async (parent, args, ctx, info) => parent.rating,
    },
};