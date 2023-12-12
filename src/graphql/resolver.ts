import * as crypto from "crypto";

import { Filter, ObjectId } from "mongodb";
import { GraphQLError, GraphQLScalarType, Kind } from "graphql";

import * as Config from "../../config";
import * as Default from "../lib/default";
import * as Error from "../lib/error";
import * as In from "./internal";
import * as Ex from "./external";
import { Server } from "../lib/app";
import { Collection, Module, Operation } from "../lib/enum";
import { JwtPayload, TypeResolver, RootResolver } from "../lib/interface";
import { Authorizer, Osrm, PostGIS, Strings, Validator } from "../lib/util";

export const scalar = {
    ObjectId: new GraphQLScalarType<ObjectId | null, string>({
        name: "ObjectId",
        description: "The GraphQL frontend for BSON.ObjectId from MongoDB",
        serialize(value) {
            if (value instanceof ObjectId) {
                return value.toHexString();
            }
            throw new GraphQLError(`Couldn't serialize "${value}". Make sure the value provided is an instance of ObjectId`);
        },
        parseValue(value) {
            if (typeof value === "string") {
                return new ObjectId(value);
            }
            throw new GraphQLError(`Couldn't parse "${value}" to ObjectId. Make sure the value provided is of type string`);
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
            throw new GraphQLError(`Couldn't serialize "${value}". Make sure the value provided is an instance of Date`);
        },
        parseValue(value) {
            if (typeof value === "number") {
                return new Date(value);
            }
            throw new GraphQLError(`Couldn't parse "${value}" to Date. Make sure the value provided is of type integer`);
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
    Query: RootResolver<In.Query, Ex.Query>,
    Mutation: RootResolver<In.Mutation, Ex.Mutation>,
} = {
    Query: {
        GetMe: async (parent, args, ctx, info) => {
            //WARNING: GetMe doesn't need any permission validation
            return Authorizer.me(ctx);
        },

        GetMyVehicles: async (parent, args: Ex.QueryGetMyVehiclesArgs, ctx, info) => {
            const me = await Authorizer.query(ctx, Module.VEHICLES, Operation.RETRIEVE);
            return await Server.db.collection<In.Vehicle>(Collection.VEHICLES).find({ ownerId: me._id })
                .skip(args.skip || Default.VALUE_SKIP)
                .limit(args.limit || Default.VALUE_LIMIT)
                .toArray();
        },

        GetMyBankAccounts: async (parent, args: Ex.QueryGetMyBankAccountsArgs, ctx, info) => {
            const me = await Authorizer.query(ctx, Module.BANK_ACCOUNTS, Operation.RETRIEVE);
            return await Server.db.collection<In.BankAccount>(Collection.BANK_ACCOUNTS).find({ ownerId: me._id })
                .skip(args.skip || Default.VALUE_SKIP)
                .limit(args.limit || Default.VALUE_LIMIT)
                .toArray();
        },

        GetMyHostedTrips: async (parent, args: Ex.QueryGetMyHostedTripsArgs, ctx, info) => {
            const me = await Authorizer.query(ctx, Module.HOSTED_TRIPS, Operation.RETRIEVE);
            const now = new Date();
            return await Server.db.collection<In.HostedTrip & Ex.HostedTrip>(Collection.HOSTED_TRIPS).find({
                hostId: me._id,
                "time.schedule": {
                    $gte: args.from || new Date(now.getTime() - Default.FILTER_TIME),
                    $lt: args.to || new Date(now.getTime() + Default.FILTER_TIME)
                }
            }).skip(args.skip || Default.VALUE_SKIP)
                .limit(args.limit || Default.VALUE_LIMIT)
                .toArray();
        },

        GetMyHostedTrip: async (parent, args: Ex.QueryGetMyHostedTripArgs, ctx, info) => {
            const me = await Authorizer.query(ctx, Module.HOSTED_TRIPS, Operation.RETRIEVE);
            return await Validator.getIfExists<In.HostedTrip & Ex.HostedTrip>(Collection.HOSTED_TRIPS, "hosted trip", {
                _id: args._id,
                hostId: me._id
            });
        },

        GetMyRequestedTrips: async (parent, args: Ex.QueryGetMyRequestedTripsArgs, ctx, info) => {
            const me = await Authorizer.query(ctx, Module.REQUESTED_TRIPS, Operation.RETRIEVE);
            const now = new Date();
            return await Server.db.collection<In.RequestedTrip & Ex.RequestedTrip>(Collection.REQUESTED_TRIPS).find({
                requesterId: me._id,
                "time.schedule": {
                    $gte: args.from || new Date(now.getTime() - Default.FILTER_TIME),
                    $lt: args.to || new Date(now.getTime() + Default.FILTER_TIME)
                }
            }).skip(args.skip || Default.VALUE_SKIP)
                .limit(args.limit || Default.VALUE_LIMIT)
                .toArray();
        },

        GetMyRequestedTrip: async (parent, args: Ex.QueryGetMyRequestedTripArgs, ctx, info) => {
            const me = await Authorizer.query(ctx, Module.REQUESTED_TRIPS, Operation.RETRIEVE);
            return await Validator.getIfExists<In.RequestedTrip & Ex.RequestedTrip>(Collection.REQUESTED_TRIPS, "requested trip", {
                _id: args._id,
                requesterId: me._id
            });
        },

        GetMyHandshakes: async (parent, args: Ex.QueryGetMyHandshakesArgs, ctx, info) => {
            const me = await Authorizer.query(ctx, Module.HANDSHAKES, Operation.RETRIEVE);

            const options: Filter<In.Handshake & Ex.Handshake> = {};

            if (args.sent === true) {
                //CASE: Filter handshakes sent by me
                options.senderId = me._id;
            } else if (args.sent === false) {
                //CASE: Filter handshakes received by me
                options.recipientId = me._id;
            } else {
                //CASE: Retrieve everything either sent or received by me
                if (!options["$or"]) {
                    options["$or"] = [];
                }

                options["$or"].push(
                    { senderId: me._id },
                    { recipientId: me._id }
                );
            }

            if (args.tripId) {
                //NOTE: tripId could be a hostedTripId or a requestedTripId
                //CASE: Retrieve the handshake where hostedTripId=tripId or requestedTripId=tripId
                if (!options["$or"]) {
                    options["$or"] = [];
                }

                options["$or"].push(
                    { hostedTripId: args.tripId },
                    { requestedTripId: args.tripId }
                );
            }

            if (args.state) {
                //CASE: Add a filter based on state
                options[`time.${Strings.screamingSnake2Camel(args.state)}`] = {
                    "$exists": true
                }
            }

            console.log(options);

            return await Server.db.collection<In.Handshake & Ex.Handshake>(Collection.HANDSHAKES).find(options)
                .skip(args.skip || Default.VALUE_SKIP)
                .limit(args.limit || Default.VALUE_LIMIT)
                .toArray();
        },

        GetMyHandshake: async (parent, args: Ex.QueryGetMyHandshakeArgs, ctx, info) => {
            const me = await Authorizer.query(ctx, Module.HANDSHAKES, Operation.RETRIEVE);
            return await Validator.getIfExists<In.Handshake & Ex.Handshake>(Collection.HANDSHAKES, "handshake", {
                _id: args._id,
                $or: [
                    { senderId: me._id },
                    { recipientId: me._id }
                ]
            });
        },

        GetMatchingRequestedTrips: async (parent, args: Ex.QueryGetMatchingRequestedTripsArgs, ctx, info) => {
            const me = await Authorizer.query(ctx, Module.REQUESTED_TRIPS, Operation.RETRIEVE);

            const hostedTrip = await Validator.getIfExists<In.HostedTrip>(Collection.HOSTED_TRIPS, "hosted trip", {
                _id: args.hostedTripId
            });

            //Validate if hosted trip's host is current user
            if (!hostedTrip.hostId.equals(me._id)) {
                throw new Error.ItemNotAccessibleByUser("hosted trip", "_id", args.hostedTripId.toHexString());
            }

            //Validate if hosted trip is not expired
            if (hostedTrip.time.ended) {
                throw new Error.ItemIsNotActive("hosted trip", "_id", args.hostedTripId.toHexString());
            }

            if (!hostedTrip.vehicle) {
                hostedTrip.vehicle = await Validator.getIfExists<In.Vehicle & Ex.Vehicle>(Collection.VEHICLES, "vehicle", {
                    _id: hostedTrip.vehicleId
                });
            }

            const requestedTrips = Server.db.collection<In.RequestedTrip & Ex.RequestedTrip>(Collection.REQUESTED_TRIPS).find({
                //Filter requested trips that are +-1h to hosted trip
                "time.schedule": {
                    $gte: new Date(hostedTrip.time.schedule.getTime() - Default.FILTER_SCHEDULE),
                    $lt: new Date(hostedTrip.time.schedule.getTime() + Default.FILTER_SCHEDULE)
                },

                //Filter out requested trips that are mine
                requesterId: {
                    $ne: me._id
                }
            });

            const matchingRequestedTrips: Ex.RequestedTrip[] = [];

            //For each requested trip, calculate match results
            requestedTripLoop: for await (const requestedTrip of requestedTrips) {
                if ((BigInt(hostedTrip.route.tileOverlapIndex) & BigInt(requestedTrip.route.tileOverlapIndex)) === 0n) {
                    //CASE: There is no intersection between hostedTrip's route and requestedTrip's possible routes
                    continue;
                }

                //Try to match vehicle features
                for (const featureKey of Object.keys(requestedTrip.vehicleFeatures) as (keyof In.VehicleFeatures)[]) {
                    if (typeof requestedTrip.vehicleFeatures[featureKey] === "boolean") {
                        //CASE: Requester cares about the feature being present or not
                        if (hostedTrip.vehicle!.features[featureKey] !== requestedTrip.vehicleFeatures[featureKey]) {
                            //CASE: Requester's feature preference doesn't match with hosted vehicle's
                            continue;
                        }
                    }
                }

                //Test if requested trip's keyCoords are near to the path of hosted trip
                for (const coord of requestedTrip.route.keyCoords) {
                    if (!await PostGIS.isPointWithin(coord as [number, number], Default.PROXIMITY_RADIUS, hostedTrip.route.polyLines)) {
                        //CASE: The hosted trip's route is not within the key coordinate's proximity radius
                        //CASE: AT least one key coordinate is far from hosted trip's route
                        continue requestedTripLoop;
                    }
                }

                //CASE: Currently iterating requested trip has passed all the requirements to be a match
                matchingRequestedTrips.push(requestedTrip);
            }

            return matchingRequestedTrips;
        },
    },

    Mutation: {
        CreateGenericUser: async (parent, args: Ex.MutationCreateGenericUserArgs, ctx, info) => {
            const result = await Server.db.collection<In.UserInput>(Collection.USERS).insertOne({
                ...args.user,
                isActive: true,
                roleId: new ObjectId(Default.ID_ROLE),
                rating: {
                    asHost: {
                        driving: 0.0,
                        politeness: 0.0,
                        punctuality: 0.0,
                        meetsCondition: 0.0,
                    },
                    asRequester: {
                        politeness: 0.0,
                        punctuality: 0.0,
                    }
                },
                secret: {
                    hash: crypto.createHash("sha1").update(args.user.password).digest("hex")
                }
            });

            if (!result.acknowledged) {
                throw new Error.CouldNotPerformOperation(Module.USERS, Operation.CREATE);
            }

            return await Server.jwtr.sign(
                { userId: result.insertedId.toHexString() } as JwtPayload,
                Config.SECRET_JWT,
                { expiresIn: "5d" }
            );
        },

        SignIn: async (parent, args: Ex.MutationSignInArgs, ctx, info) => {
            const item = await Validator.getIfActive<In.User>(Collection.USERS, "user", {
                mobile: args.mobile
            });

            const generatedHash = crypto.createHash("sha1").update(args.password).digest("hex");
            if (generatedHash !== item.secret!.hash) {
                throw new Error.PasswordMismatch(args.mobile);
            }

            return await Server.jwtr.sign(
                { userId: item._id.toHexString() } as JwtPayload,
                Config.SECRET_JWT,
                { expiresIn: "7d" }
            );
        },

        AddVehicle: async (parent, args: Ex.MutationAddVehicleArgs, ctx, info) => {
            const me = await Authorizer.query(ctx, Module.VEHICLES, Operation.CREATE);
            const result = await Server.db.collection<In.VehicleInput>(Collection.VEHICLES).insertOne({
                ...args.vehicle,
                ownerId: me._id,
                isActive: true,
                rating: {
                    ac: 0,
                    cleanliness: 0
                }
            });

            if (!result.acknowledged) {
                throw new Error.CouldNotPerformOperation(Module.VEHICLES, Operation.CREATE);
            }
            return result.insertedId;
        },

        AddBankAccount: async (parent, args: Ex.MutationAddBankAccountArgs, ctx, info) => {
            const me = await Authorizer.query(ctx, Module.BANK_ACCOUNTS, Operation.CREATE);
            const result = await Server.db.collection<In.BankAccountInput>(Collection.BANK_ACCOUNTS).insertOne({
                ...args.bankAccount,
                ownerId: me._id,
                isActive: true
            });

            if (!result.acknowledged) {
                throw new Error.CouldNotPerformOperation(Module.BANK_ACCOUNTS, Operation.CREATE);
            }
            return result.insertedId;
        },

        AddHostedTrip: async (parent, args: Ex.MutationAddHostedTripArgs, ctx, info) => {
            const me = await Authorizer.query(ctx, Module.HOSTED_TRIPS, Operation.CREATE);
            const tripToBeInserted: In.HostedTripInput = {
                ...args.hostedTrip,
                hostId: me._id,
                vehicle: undefined,
                route: {
                    ...args.hostedTrip.route,
                    tileOverlapIndex: "" //Will be calculated after validation
                }
            };

            //Validate keyCoords
            Validator.validateCoords(args.hostedTrip.route.keyCoords, "route", "keyCoords");

            //Validate bank account
            await Validator.getIfActive<In.BankAccount>(Collection.BANK_ACCOUNTS, "bank account", {
                _id: args.hostedTrip.billing.bankAccountId
            });

            //Validate vehicleId and vehicle
            if (args.hostedTrip.vehicleId) {
                //CASE: User has assigned a saved vehicle
                //Validate vehicle
                const vehicle = await Validator.getIfActive<In.Vehicle>(Collection.VEHICLES, "vehicle", {
                    _id: args.hostedTrip.vehicleId
                });

                tripToBeInserted.vehicleId = vehicle._id;
            } else if (args.hostedTrip.vehicle) {
                //CASE: User has assigned a temporary vehicle
                tripToBeInserted.vehicle = {
                    ...args.hostedTrip.vehicle,
                    isActive: true,
                    rating: {
                        ac: 0.0,
                        cleanliness: 0.0
                    }
                }
            } else {
                //CASE: User hasn't provided any vehicleId or vehicle
                throw new Error.InvalidFieldValue("hosted trip", "vehicleId/vehicle", "null", "either vehicleId or vehicle field mut be provided");
            }

            //Calculate tileOverlapIndex
            tripToBeInserted.route.tileOverlapIndex = (await PostGIS.calculateTileOverlapIndex(args.hostedTrip.route.polyLines)).toString();

            const result = await Server.db.collection<In.HostedTripInput>(Collection.HOSTED_TRIPS).insertOne(tripToBeInserted);
            if (!result.acknowledged) {
                throw new Error.CouldNotPerformOperation(Module.HOSTED_TRIPS, Operation.CREATE);
            }

            return result.insertedId;
        },

        AddRequestedTrip: async (parent, args: Ex.MutationAddRequestedTripArgs, ctx, info) => {
            const me = await Authorizer.query(ctx, Module.REQUESTED_TRIPS, Operation.CREATE);

            //Validate keyCoords
            Validator.validateCoords(args.requestedTrip.route.keyCoords, "route", "keyCoords");

            //Calculate all possible routes of the requested trip using OSRM
            const routes = await Osrm.calculatePossibleRoutes(args.requestedTrip.route.keyCoords);
            //For each possible route...
            //Calculate corresponding tileOverlapIndex then Bitwise-OR with globalTileOverlapIndex
            let globalTileOverlapIndex = 0n;
            for (const route of routes) {
                const polyLines = Osrm.extractRoutePolyLines(route);
                globalTileOverlapIndex |= await PostGIS.calculateTileOverlapIndex(polyLines);
            }

            const result = await Server.db.collection<In.RequestedTripInput>(Collection.REQUESTED_TRIPS).insertOne({
                ...args.requestedTrip,
                requesterId: me._id,
                route: {
                    ...args.requestedTrip.route,
                    tileOverlapIndex: globalTileOverlapIndex.toString()
                }
            });
            if (!result.acknowledged) {
                throw new Error.CouldNotPerformOperation(Module.REQUESTED_TRIPS, Operation.CREATE);
            }

            return result.insertedId;
        },

        InitHandshake: async (parent, args: Ex.MutationInitHandshakeArgs, ctx, info) => {
            const me = await Authorizer.query(ctx, Module.HANDSHAKES, Operation.CREATE);
            const hostedTrip = await Validator.getIfExists<In.HostedTrip>(Collection.HOSTED_TRIPS, "hosted trip", {
                _id: args.hostedTripId
            });
            const requestedTrip = await Validator.getIfExists<In.RequestedTrip>(Collection.REQUESTED_TRIPS, "requested trip", {
                _id: args.requestedTripId
            });

            const handshakeToBeInserted: In.HandshakeInput = {
                hostedTripId: args.hostedTripId,
                requestedTripId: args.requestedTripId,
                senderId: me._id,
                recipientId: me._id, //WARNING: The correct id is assigned later
                payment: {
                    amount: -1 //TODO: Must be calculated properly
                },
                rating: {
                    host: {
                        driving: 0, meetsCondition: 0, politeness: 0, punctuality: 0
                    },
                    requester: {
                        politeness: 0, punctuality: 0
                    },
                    vehicle: {
                        ac: 0, cleanliness: 0
                    }
                },
                time: {
                    initiated: new Date()
                }
            };

            //Update recipientId to correct value
            if (hostedTrip.hostId.equals(me._id)) {
                if (requestedTrip.requesterId.equals(me._id)) {
                    //CASE: Both trips are mine
                    throw new Error.InvalidFieldValue("handshake", "requestedTripId", args.requestedTripId.toString(), "requested trip is also owned by you");
                } else {
                    //CASE: I'm the owner of hosted trip
                    //Handshake goes from my hosted trip to a requested trip
                    handshakeToBeInserted.recipientId = requestedTrip.requesterId;
                }
            } else if (requestedTrip.requesterId.equals(me._id)) {
                if (hostedTrip.hostId.equals(me._id)) {
                    //CASE: Both trips are mine
                    throw new Error.InvalidFieldValue("handshake", "hostedTripId", args.hostedTripId.toString(), "hosted trip is also owned by you");
                } else {
                    //CASE: I'm the owner of requested trip
                    //Handshake goes from my requested trip to a hosted trip
                    handshakeToBeInserted.recipientId = hostedTrip.hostId;
                }
            } else {
                //CASE: None of the trips belong to me
                throw new Error.ItemNotAccessibleByUser("hosted trip/requested trip", "_id", `${args.hostedTripId.toString()}/${args.requestedTripId.toString()}`);
            }

            const result = await Server.db.collection<In.HandshakeInput>(Collection.HANDSHAKES).insertOne(handshakeToBeInserted);
            if (!result.acknowledged) {
                throw new Error.CouldNotPerformOperation(Module.REQUESTED_TRIPS, Operation.CREATE);
            }

            return result.insertedId;
        },

        UpdateTripState: async (parent, args: Ex.MutationUpdateTripStateArgs, ctx, info) => {
            const hostedTrip = await Server.db.collection<In.HostedTrip>(Collection.HOSTED_TRIPS).findOne({
                _id: args.tripId
            });

            let trip: In.HostedTrip | In.RequestedTrip;

            if (hostedTrip) {
                //CASE: tripId refers to a hosted trip
                const me = await Authorizer.query(ctx, Module.HOSTED_TRIPS, Operation.UPDATE);
                if (!hostedTrip.hostId.equals(me._id)) {
                    throw new Error.ItemNotAccessibleByUser("hosted trip", "_id", hostedTrip._id.toHexString());
                }
                trip = hostedTrip;
            } else {
                //CASE: tripId doesn't refer to a hosted trip
                //The trip must be a requested trip, otherwise it's an error
                const requestedTrip = await Validator.getIfExists<In.RequestedTrip>(Collection.REQUESTED_TRIPS, "hosted trip/requested trip", {
                    _id: args.tripId
                });

                //CASE: tripId refers to a requested trip
                const me = await Authorizer.query(ctx, Module.REQUESTED_TRIPS, Operation.UPDATE);
                if (!requestedTrip.requesterId.equals(me._id)) {
                    throw new Error.ItemNotAccessibleByUser("requested trip", "_id", requestedTrip._id.toHexString());
                }
                trip = requestedTrip;
            }

            const fieldToBeUpdated = `time.${Strings.screamingSnake2Camel(args.state)}`;
            const result = await Server.db.collection<In.RequestedTrip>(Collection.REQUESTED_TRIPS).updateOne(
                { _id: trip._id },
                { $set: { [fieldToBeUpdated]: new Date() } }
            );
            return result.acknowledged;
        },

        UpdateHandshakeState: async (parent, args: Ex.MutationUpdateHandshakeStateArgs, ctx, info) => {
            const me = await Authorizer.query(ctx, Module.HANDSHAKES, Operation.UPDATE);
            const handshake = await Validator.getIfExists<In.Handshake>(Collection.HANDSHAKES, "handshake", {
                _id: args._id
            });

            switch (args.state) {
                case Ex.HandshakeState.INITIATED: {
                    //WANING: Cannot modify INITIATED state
                    throw new Error.InvalidFieldValue("handshake", "state", args.state, `The ${Ex.HandshakeState.INITIATED} state of a handshake cannot be modified.`);
                }

                case Ex.HandshakeState.SENT: {
                    //CASE: Done by sender
                    if (!handshake.senderId.equals(me._id)) {
                        throw new Error.ItemNotAccessibleByUser("handshake", "_id", args._id.toHexString());
                    }
                    //NOTE: Dependant on the handshake's state being INITIATED
                    //NOTE: Since INITIATED state is always present, no need to check for its dependency
                    break;
                }

                case Ex.HandshakeState.SEEN: {
                    //CASE: Done by recipient
                    if (!handshake.recipientId.equals(me._id)) {
                        throw new Error.ItemNotAccessibleByUser("handshake", "_id", args._id.toHexString());
                    }
                    //NOTE: Dependant on the handshake's state being SENT
                    if (!handshake.time.sent) {
                        //CASE: Handshake is in INITIATED state
                        throw new Error.InvalidItemState("handshake", "_id", args._id.toHexString(), Ex.HandshakeState.INITIATED, Ex.HandshakeState.INITIATED, Ex.HandshakeState.SEEN);
                    }
                    break;
                }

                case Ex.HandshakeState.ACCEPTED: {
                    //CASE: Done by recipient
                    if (!handshake.recipientId.equals(me._id)) {
                        throw new Error.ItemNotAccessibleByUser("handshake", "_id", args._id.toHexString());
                    }
                    //NOTE: Dependant on the handshake's state being SEEN
                    if (!handshake.time.seen) {
                        //CASE: Handshake is in SENT state
                        throw new Error.InvalidItemState("handshake", "_id", args._id.toHexString(), Ex.HandshakeState.SENT, Ex.HandshakeState.SEEN, Ex.HandshakeState.ACCEPTED);
                    }
                    break;
                }

                case Ex.HandshakeState.CONFIRMED_REQUESTED_TRIP_START: {
                    //CASE: Done by requester
                    const requestedTrip = await Validator.getIfExists<In.RequestedTrip>(Collection.REQUESTED_TRIPS, "requested trip", {
                        _id: handshake.requestedTripId
                    });
                    if (!requestedTrip.requesterId.equals(me._id)) {
                        throw new Error.ItemNotAccessibleByUser("handshake", "_id", args._id.toHexString());
                    }
                    //NOTE: Dependant on the handshake's state being ACCEPTED
                    if (!handshake.time.accepted) {
                        //CASE: Handshake is in SEEN state
                        throw new Error.InvalidItemState("handshake", "_id", args._id.toHexString(), Ex.HandshakeState.SEEN, Ex.HandshakeState.ACCEPTED, Ex.HandshakeState.CONFIRMED_REQUESTED_TRIP_START);
                    }
                    break;
                }

                case Ex.HandshakeState.CONFIRMED_REQUESTED_TRIP_END: {
                    //CASE: Done by host
                    const hostedTrip = await Validator.getIfExists<In.HostedTrip>(Collection.HOSTED_TRIPS, "hosted trip", {
                        _id: handshake.hostedTripId
                    });
                    if (!hostedTrip.hostId.equals(me._id)) {
                        throw new Error.ItemNotAccessibleByUser("handshake", "_id", args._id.toHexString());
                    }
                    //NOTE: Dependant on the handshake's state being CONFIRMED_REQUESTED_TRIP_START
                    if (!handshake.time.confirmedRequestedTripStart) {
                        //CASE: Handshake is in ACCEPTED state
                        throw new Error.InvalidItemState("handshake", "_id", args._id.toHexString(), Ex.HandshakeState.ACCEPTED, Ex.HandshakeState.CONFIRMED_REQUESTED_TRIP_START, Ex.HandshakeState.CONFIRMED_REQUESTED_TRIP_END);
                    }
                    break;
                }
            }

            const fieldToBeUpdated = `time.${Strings.screamingSnake2Camel(args.state)}`;
            const result = await Server.db.collection<In.Handshake>(Collection.HANDSHAKES).updateOne(
                { _id: handshake._id },
                args.value === true ? { $set: { [fieldToBeUpdated]: new Date() } } : { $unset: { [fieldToBeUpdated]: "" } }
            );
            return result.acknowledged;
        },
    },
}

export const type: {
    HostedTrip: TypeResolver<In.HostedTrip, Ex.HostedTrip>,
    TripBilling: TypeResolver<In.TripBilling, Ex.TripBilling>,
    RequestedTrip: TypeResolver<In.RequestedTrip, Ex.RequestedTrip>,
    Handshake: TypeResolver<In.Handshake, Ex.Handshake>,
} = {
    HostedTrip: {
        route: async (parent, args, ctx, info) => parent.route,

        host: async (parent, args, ctx, info) => {
            await Authorizer.query(ctx, Module.USERS, Operation.RETRIEVE);
            return await Validator.getIfExists<In.User>(Collection.USERS, "user/host", {
                _id: parent.hostId
            });
        },

        vehicle: async (parent, args, ctx, info) => {
            if (parent.vehicleId) {
                //CASE: vehicleId exists.
                //User has assigned a saved vehicle. It must be retrieved from database
                await Authorizer.query(ctx, Module.VEHICLES, Operation.RETRIEVE);
                return await Validator.getIfExists<In.Vehicle>(Collection.VEHICLES, "vehicle", {
                    _id: parent.vehicleId
                });
            } else {
                //CASE: vehicleId doesn't exists.
                //User has assigned a temporary vehicle. It must be available as an embedded document
                return parent.vehicle as Ex.Vehicle;
            }
        },

        billing: async (parent, args, ctx, info) => {
            return {
                ...parent.billing,
                bankAccount: {} as Ex.BankAccount
            }
        },

        hasHandshakes: async (parent, args, ctx, info) => {
            await Authorizer.query(ctx, Module.HANDSHAKES, Operation.RETRIEVE);
            return Server.db.collection<In.Handshake>(Collection.HANDSHAKES).find({
                hostedTripId: parent._id,
            }).hasNext();
        },
    },

    TripBilling: {
        bankAccount: async (parent, args, ctx, info) => {
            await Authorizer.query(ctx, Module.BANK_ACCOUNTS, Operation.RETRIEVE);
            return await Validator.getIfExists<In.BankAccount>(Collection.BANK_ACCOUNTS, "bank account", {
                _id: parent.bankAccountId
            });
        },
    },

    RequestedTrip: {
        route: async (parent, args, ctx, info) => parent.route,

        requester: async (parent, args, ctx, info) => {
            await Authorizer.query(ctx, Module.USERS, Operation.RETRIEVE);
            return await Validator.getIfExists<In.User>(Collection.USERS, "user/requester", {
                _id: parent.requesterId
            });
        },

        hasHandshakes: async (parent, args, ctx, info) => {
            await Authorizer.query(ctx, Module.HANDSHAKES, Operation.RETRIEVE);
            return Server.db.collection<In.Handshake>(Collection.HANDSHAKES).find({
                requestedTripId: parent._id,
            }).hasNext();
        },
    },

    Handshake: {
        sender: async (parent, args, ctx, info) => {
            await Authorizer.query(ctx, Module.USERS, Operation.RETRIEVE);
            return await Validator.getIfExists<In.User>(Collection.USERS, "user/sender", {
                _id: parent.senderId
            });
        },

        recipient: async (parent, args, ctx, info) => {
            await Authorizer.query(ctx, Module.USERS, Operation.RETRIEVE);
            return await Validator.getIfExists<In.User>(Collection.USERS, "user/recipient", {
                _id: parent.recipientId
            });
        },

        hostedTrip: async (parent, args, ctx, info) => {
            await Authorizer.query(ctx, Module.HOSTED_TRIPS, Operation.RETRIEVE);
            return await Validator.getIfExists<In.HostedTrip & Ex.HostedTrip>(Collection.HOSTED_TRIPS, "hosted trip", {
                _id: parent.hostedTripId
            });
        },

        requestedTrip: async (parent, args, ctx, info) => {
            await Authorizer.query(ctx, Module.REQUESTED_TRIPS, Operation.RETRIEVE);
            return await Validator.getIfExists<In.RequestedTrip & Ex.RequestedTrip>(Collection.REQUESTED_TRIPS, "requested trip", {
                _id: parent.requestedTripId
            });
        },
    },
};