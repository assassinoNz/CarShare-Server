import * as crypto from "crypto";
import fetch from "node-fetch";
import * as jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";
import { GraphQLError, GraphQLScalarType, Kind } from "graphql";

import * as Error from "../lib/error";
import * as In from "./internal";
import * as Ex from "./external";
import { Server } from "../lib/app";
import { ModuleId, Operation } from "../lib/enum";
import { JwtValue, Resolver } from "../lib/interface";
import { PermissionManager, PostGIS } from "../lib/util";
import { SECRET_JWT, URL_OSRM } from "../../config";
import { ID_ROLE } from "../lib/default";

export const QueryResolver: Resolver<In.Query, Ex.Query> = {
    GetMe: async (parent, args, ctx, info) => {
        //WARNING: GetMe doesn't need any permission validation
        return PermissionManager.getMe(ctx);
    },

    GetMyVehicles: async (parent, args, ctx, info) => {
        await PermissionManager.queryPermission(ctx.user, ModuleId.VEHICLES, Operation.RETRIEVE);
        const me = PermissionManager.getMe(ctx);
        return await Server.db.collection<In.Vehicle>("vehicles").find({
            ownerId: me._id
        }).toArray();
    },

    GetMyBankAccounts: async (parent, args, ctx, info) => {
        await PermissionManager.queryPermission(ctx.user, ModuleId.BANK_ACCOUNTS, Operation.RETRIEVE);
        const me = PermissionManager.getMe(ctx);
        return await Server.db.collection<In.BankAccount>("bankAccounts").find({
            ownerId: me._id
        }).toArray();
    },

    GetMyHostedTrips: async (parent, args, ctx, info) => {
        await PermissionManager.queryPermission(ctx.user, ModuleId.HOSTED_TRIPS, Operation.RETRIEVE);
        const me = PermissionManager.getMe(ctx);
        return await Server.db.collection<In.HostedTrip & Ex.HostedTrip>("hostedTrips").find({
            hostId: me._id
        }).toArray();
    },

    GetMyRequestedTrips: async (parent, args, ctx, info) => {
        await PermissionManager.queryPermission(ctx.user, ModuleId.REQUESTED_TRIPS, Operation.RETRIEVE);
        const me = PermissionManager.getMe(ctx);
        return await Server.db.collection<In.RequestedTrip & Ex.RequestedTrip>("requestedTrips").find({
            requesterId: me._id
        }).toArray();
    },

    GetMySentNotifications: async (parent, args, ctx, info) => {
        await PermissionManager.queryPermission(ctx.user, ModuleId.NOTIFICATIONS, Operation.RETRIEVE);
        const me = PermissionManager.getMe(ctx);
        return await Server.db.collection<In.Notification & Ex.Notification>("notifications").find({
            senderId: me._id
        }).toArray();
    },

    GetMyReceivedNotifications: async (parent, args, ctx, info) => {
        await PermissionManager.queryPermission(ctx.user, ModuleId.NOTIFICATIONS, Operation.RETRIEVE);
        const me = PermissionManager.getMe(ctx);
        return await Server.db.collection<In.Notification & Ex.Notification>("notifications").find({
            recipientId: me._id
        }).toArray();
    },

    GetMatchingRequestedTrips: async (parent, args: Ex.QueryGetMatchingRequestedTripsArgs, ctx, info) => {
        await PermissionManager.queryPermission(ctx.user, ModuleId.REQUESTED_TRIPS, Operation.RETRIEVE);

        //Retrieve the hosted trip
        const item = await Server.db.collection<In.HostedTrip & Ex.HostedTrip>("hostedTrips").findOne({
            _id: args.hostedTripId
        });

        //TODO: Test if hosted trip's host is current user

        if (item) {
            const hostedTripPolyLines = item.route.polyLines!;
            const requestedTripMatches: Ex.RequestedTripMatch[] = [];

            //DANGER: Must me optimized. Find a better way than retrieving all requested trips 
            //Get all requested trips
            const items = await Server.db.collection<In.RequestedTrip & Ex.RequestedTrip>("requestedTrips").find().toArray();

            //For each requested trip, calculate match results
            for (const requestedTrip of items) {
                //Query all possible routes of the requested trip using OSRM
                const routes = await fetch(`${URL_OSRM}/${requestedTrip.route.keyCoords?.map(keyCoord => keyCoord.join(",")).join(";")}?overview=false&steps=true`)
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
                    hostedTrip: item,
                    requestedTrip: requestedTrip,
                    results: tripMatchResults
                });
            }

            return requestedTripMatches;
        } else {
            throw new Error.ItemDoesNotExist("hosted trip", "id", args.hostedTripId.toHexString());
        }
    },
};

export const MutationResolver: Resolver<In.Mutation, Ex.Mutation> = {
    SignIn: async (parent, args: Ex.MutationSignInArgs, ctx, info) => {
        const user = await Server.db.collection<In.User>("users").findOne({
            mobile: args.mobile
        });

        if (user) {
            const generatedHash = crypto.createHash("sha1").update(args.password).digest("hex");
            if (generatedHash === user.secret!.hash) {
                return jwt.sign({
                    userId: ScalarResolver.ObjectId.serialize(user._id)
                } as JwtValue,
                SECRET_JWT,
                {
                    expiresIn: "7d"
                });
            } else {
                throw new Error.PasswordMismatch(args.mobile);
            }
        } else {
            throw new Error.ItemDoesNotExist("user", "mobile", args.mobile);
        }
    },

    AddUser: async (parent, args: Ex.MutationAddUserArgs, ctx, info) => {
        await PermissionManager.queryPermission(ctx.user, ModuleId.USERS, Operation.CREATE);

        const newItem = await Server.db.collection<In.UserInput>("users").insertOne({
            mobile: args.user.mobile,
            email: args.user.email,
            preferredName: args.user.preferredName,
            roleId: new ObjectId(ID_ROLE),
            rating: {
                driving: 0.0,
                politeness: 0.0,
                punctuality: 0.0,
            },
            secret: {
                hash: crypto.createHash("sha1").update(args.user.password).digest("hex")
            }
        });

        return newItem.insertedId;
    },
};

export const ScalarResolver = {
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

export const HostedTripResolver: Resolver<In.HostedTrip, Ex.HostedTrip> = {
    _id: async (parent, args, ctx, info) => parent._id,

    host: async (parent, args, ctx, info) => {
        await PermissionManager.queryPermission(ctx.user, ModuleId.USERS, Operation.RETRIEVE);
        const item = await Server.db.collection<In.User>("users").findOne({
            _id: parent.hostId
        });

        if (item) {
            return item;
        } else {
            throw new Error.ItemDoesNotExist("user/host", "id", args.id.toHexString());
        }
    },

    route: async (parent, args, ctx, info) => parent.route,

    time: async (parent, args, ctx, info) => parent.time,

    vehicle: async (parent, args, ctx, info) => {
        if (parent.vehicleId) {
            //CASE: vehicleId exists.
            //User has assigned a saved vehicle. It must be retrieved from database
            await PermissionManager.queryPermission(ctx.user, ModuleId.VEHICLES, Operation.RETRIEVE);
            const item = await Server.db.collection<In.Vehicle & Ex.Vehicle>("vehicles").findOne({
                _id: parent.vehicleId
            });
    
            if (item) {
                return item;
            } else {
                throw new Error.ItemDoesNotExist("vehicle", "id", args.id.toHexString());
            }
        } else {
            //CASE: vehicleId doesn't exists.
            //User has assigned a temporary vehicle. It must be available as an embedded document
            return parent.vehicle as Ex.Vehicle;
        }
    },

    seats: async (parent, args, ctx, info) => parent.seats,

    billing: async (parent, args, ctx, info) => parent.billing,

    rating: async (parent, args, ctx, info) => parent.rating,
};

export const TripBillingResolver: Resolver<In.TripBilling, Ex.TripBilling> = {
    bankAccount: async (parent, args, ctx, info) => {
        await PermissionManager.queryPermission(ctx.user, ModuleId.BANK_ACCOUNTS, Operation.RETRIEVE);
        const item = await Server.db.collection<In.BankAccount>("bankAccounts").findOne({
            _id: parent.bankAccountId
        });

        if (item) {
            return item;
        } else {
            throw new Error.ItemDoesNotExist("bank account", "id", args.id.toHexString());
        }
    },

    priceFirstKm: async (parent, args, ctx, info) => parent.priceFirstKm,

    priceNextKm: async (parent, args, ctx, info) => parent.priceNextKm,
};

export const RequestedTripResolver: Resolver<In.RequestedTrip, Ex.RequestedTrip> = {
    _id: async (parent, args, ctx, info) => parent._id,
    
    requester: async (parent, args, ctx, info) => {
        await PermissionManager.queryPermission(ctx.user, ModuleId.USERS, Operation.RETRIEVE);
        const item = await Server.db.collection<In.User & Ex.User>("users").findOne({
            _id: parent.requesterId
        });

        if (item) {
            return item;
        } else {
            throw new Error.ItemDoesNotExist("user/requester", "id", args.id.toHexString());
        }
    },

    route: async (parent, args, ctx, info) => parent.route,

    time: async (parent, args, ctx, info) => parent.time,

    seats: async (parent, args, ctx, info) => parent.seats,
};

export const NotificationResolver: Resolver<In.Notification, Ex.Notification> = {
    _id: async (parent, args, ctx, info) => parent._id,

    sender: async (parent, args, ctx, info) => {
        await PermissionManager.queryPermission(ctx.user, ModuleId.USERS, Operation.RETRIEVE);
        const item = await Server.db.collection<In.User>("users").findOne({
            _id: parent.senderId
        });

        if (item) {
            return item;
        } else {
            throw new Error.ItemDoesNotExist("user/sender", "id", args.id.toHexString());
        }
    },

    recipient: async (parent, args, ctx, info) => {
        await PermissionManager.queryPermission(ctx.user, ModuleId.USERS, Operation.RETRIEVE);
        const item = await Server.db.collection<In.User>("users").findOne({
            _id: parent.recipientId
        });

        if (item) {
            return item;
        } else {
            throw new Error.ItemDoesNotExist("user/recipient", "id", args.id.toHexString());
        }
    },

    hostedTrip: async (parent, args, ctx, info) => {
        await PermissionManager.queryPermission(ctx.user, ModuleId.HOSTED_TRIPS, Operation.RETRIEVE);
        const item = await Server.db.collection<In.HostedTrip & Ex.HostedTrip>("hostedTrips").findOne({
            _id: parent.hostedTripId
        });

        if (item) {
            return item;
        } else {
            throw new Error.ItemDoesNotExist("hosted trip", "id", args.id.toHexString());
        }
    },

    requestedTrip: async (parent, args, ctx, info) => {
        await PermissionManager.queryPermission(ctx.user, ModuleId.REQUESTED_TRIPS, Operation.RETRIEVE);
        const item = await Server.db.collection<In.RequestedTrip & Ex.RequestedTrip>("requestedTrips").findOne({
            _id: parent.requestedTripId
        });

        if (item) {
            return item;
        } else {
            throw new Error.ItemDoesNotExist("requested trip", "id", args.id.toHexString());
        }
    },

    acceptedByRecipient: async (parent, args, ctx, info) => parent.acceptedByRecipient,

    payment: async (parent, args, ctx, info) => parent.payment,
};