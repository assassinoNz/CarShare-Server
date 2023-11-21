import * as crypto from "crypto";

import * as jwt from "jsonwebtoken";
import { ObjectId } from "mongodb";
import { GraphQLError, GraphQLScalarType, Kind } from "graphql";

import * as Error from "../lib/error";
import * as Internal from "../graphql/internal";
import * as External from "../graphql/external";
import { Server } from "../lib/app";
import { ModuleId, OperationIndex } from "../lib/enum";
import { Resolver } from "../lib/interface";
import { PermissionManager } from "../lib/util";
import { SECRET_JWT } from "../config";

export const QueryResolver: Resolver<Internal.Query, External.Query> = {
    GetMe: async (parent, args, ctx, info) => {
        //WARNING: GetMe doesn't need any permission validation
        if (ctx.user) {
            return ctx.user;
        } else {
            throw new Error.NotSignedIn();
        }
    },

    GetUser: async (parent, args: External.QueryGetUserArgs, ctx, info) => {
        await PermissionManager.queryPermission(ctx.user, ModuleId.USERS, OperationIndex.RETRIEVE);
        const item = await Server.db.collection<Internal.User>("users").findOne({
            _id: args.id
        });

        if (item) {
            return item;
        } else {
            throw new Error.ItemDoesNotExist("user", "id", args.id.toHexString());
        }
    },
};

export const MutationResolver: Resolver<Internal.Mutation, External.Mutation> = {
    SignIn: async (parent, args: External.MutationSignInArgs, ctx, info) => {
        const user = await Server.db.collection<Internal.User>("users").findOne({
            username: args.username
        });

        if (user) {
            const generatedHash = crypto.createHash("sha1").update(args.password).digest("hex");
            if (generatedHash === user.secret!.hash) {
                return jwt.sign({ userId: ScalarResolver.ObjectId.serialize(user._id) }, SECRET_JWT);
            } else {
                throw new Error.PasswordMismatch(args.username);
            }
        } else {
            throw new Error.ItemDoesNotExist("user", "username", args.username);
        }
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

export const UserResolver: Resolver<Internal.User, External.User> = {
    _id: async (parent, args, ctx, info) => parent._id,

    username: async (parent, args, ctx, info) => parent.username,

    preferredName: async (parent, args, ctx, info) => parent.preferredName,

    vehicles: async (parent, args, ctx, info) => {
        await PermissionManager.queryPermission(ctx.user, ModuleId.VEHICLES, OperationIndex.RETRIEVE);
        return await Server.db.collection<Internal.Vehicle>("vehicles").find({
            _id: { $in: parent.vehicleIds }
        }).toArray();
    },

    bankAccounts: async (parent, args, ctx, info) => {
        await PermissionManager.queryPermission(ctx.user, ModuleId.BANK_ACCOUNTS, OperationIndex.RETRIEVE);
        return await Server.db.collection<Internal.BankAccount>("bankAccounts").find({
            _id: { $in: parent.bankAccountIds }
        }).toArray();
    },

    rating: async (parent, args, ctx, info) => parent.rating,
};

export const PermissionResolver: Resolver<Internal.Permission, External.Permission> = {
    value: async (parent, args, ctx, info) => parent.value,

    module: async (parent, args, ctx, info) => {
        //WARNING: Module details can be accessed by anyone
        const item = await Server.db.collection<Internal.Module>("modules").findOne({
            _id: parent.moduleId
        });

        if (item) {
            return item;
        } else {
            throw new Error.ItemDoesNotExist("role", "id", args.id.toHexString());
        }
    },
};

export const HostedTripResolver: Resolver<Internal.HostedTrip, External.HostedTrip> = {
    host: async (parent, args, ctx, info) => {
        await PermissionManager.queryPermission(ctx.user, ModuleId.USERS, OperationIndex.RETRIEVE);
        const item = await Server.db.collection<Internal.User>("users").findOne({
            _id: parent.hostId
        });

        if (item) {
            return item;
        } else {
            throw new Error.ItemDoesNotExist("user", "id", args.id.toHexString());
        }
    },

    route: async (parent, args, ctx, info) => parent.route,

    time: async (parent, args, ctx, info) => parent.time,

    vehicle: async (parent, args, ctx, info) => {
        if (parent.vehicleId) {
            await PermissionManager.queryPermission(ctx.user, ModuleId.VEHICLES, OperationIndex.RETRIEVE);
            const item = await Server.db.collection<Internal.Vehicle>("vehicles").findOne({
                _id: parent.vehicleId
            });
    
            if (item) {
                return item;
            } else {
                throw new Error.ItemDoesNotExist("vehicle", "id", args.id.toHexString());
            }
        } else {
            return parent.vehicle;
        }
    },

    seats: async (parent, args, ctx, info) => parent.seats,

    billing: async (parent, args, ctx, info) => parent.billing,

    rating: async (parent, args, ctx, info) => parent.rating,
};

export const TripBillingResolver: Resolver<Internal.TripBilling, External.TripBilling> = {
    bankAccount: async (parent, args, ctx, info) => {
        await PermissionManager.queryPermission(ctx.user, ModuleId.BANK_ACCOUNTS, OperationIndex.RETRIEVE);
        const item = await Server.db.collection<Internal.BankAccount>("bankAccounts").findOne({
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

export const RequestedTripResolver: Resolver<Internal.RequestedTrip, External.RequestedTrip> = {
    requester: async (parent, args, ctx, info) => {
        await PermissionManager.queryPermission(ctx.user, ModuleId.USERS, OperationIndex.RETRIEVE);
        const item = await Server.db.collection<Internal.User>("users").findOne({
            _id: parent.requesterId
        });

        if (item) {
            return item;
        } else {
            throw new Error.ItemDoesNotExist("user", "id", args.id.toHexString());
        }
    },

    route: async (parent, args, ctx, info) => parent.route,

    time: async (parent, args, ctx, info) => parent.time,

    seats: async (parent, args, ctx, info) => parent.seats,
};