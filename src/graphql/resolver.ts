import * as crypto from "crypto";

import { Filter, ObjectId } from "mongodb";
import { GraphQLError, GraphQLScalarType, Kind } from "graphql";

import * as Config from "../../config.js";
import * as Default from "../lib/default.js";
import * as Error from "../lib/error.js";
import * as In from "./internal.js";
import * as Ex from "./external.js";
import { Server } from "../lib/app.js";
import { Collection, Module, Operation } from "../lib/enum.js";
import { JwtPayload, TypeResolver, RootResolver } from "../lib/interface.js";
import { Authorizer, Osrm, PostGIS, Strings, Validator } from "../lib/util.js";

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
        GetMe: async (_parent, _args, ctx, _info) => {
            //WARNING: GetMe doesn't need any permission validation
            return Authorizer.me(ctx);
        },

        GetMyVehicles: async (_parent, args: Ex.QueryGetMyVehiclesArgs, ctx, _info) => {
            const me = await Authorizer.query(ctx, Module.VEHICLES, Operation.RETRIEVE);
            return await Server.db.collection<In.Vehicle>(Collection.VEHICLES).find({ ownerId: me._id })
                .skip(args.skip ?? Default.VALUE_SKIP)
                .limit(args.limit ?? Default.VALUE_LIMIT)
                .toArray();
        },

        GetMyBankAccounts: async (_parent, args: Ex.QueryGetMyBankAccountsArgs, ctx, _info) => {
            const me = await Authorizer.query(ctx, Module.BANK_ACCOUNTS, Operation.RETRIEVE);
            return await Server.db.collection<In.BankAccount>(Collection.BANK_ACCOUNTS).find({ ownerId: me._id })
                .skip(args.skip ?? Default.VALUE_SKIP)
                .limit(args.limit ?? Default.VALUE_LIMIT)
                .toArray();
        },

        GetMyHostedTrips: async (_parent, args: Ex.QueryGetMyHostedTripsArgs, ctx, _info) => {
            const me = await Authorizer.query(ctx, Module.HOSTED_TRIPS, Operation.RETRIEVE);
            const now = new Date();
            return await Server.db.collection<In.HostedTrip & Ex.HostedTrip>(Collection.HOSTED_TRIPS).find({
                hostId: me._id,
                "time.schedule": {
                    $gte: args.from || new Date(now.getTime() - Default.FILTER_TIME),
                    $lt: args.to || new Date(now.getTime() + Default.FILTER_TIME)
                }
            }).skip(args.skip ?? Default.VALUE_SKIP)
                .limit(args.limit ?? Default.VALUE_LIMIT)
                .toArray();
        },

        GetMyHostedTrip: async (_parent, args: Ex.QueryGetMyHostedTripArgs, ctx, _info) => {
            const me = await Authorizer.query(ctx, Module.HOSTED_TRIPS, Operation.RETRIEVE);
            return await Validator.getIfExists<In.HostedTrip & Ex.HostedTrip>(Collection.HOSTED_TRIPS, "hosted trip", {
                _id: args._id,
                hostId: me._id
            });
        },

        GetMyRequestedTrips: async (_parent, args: Ex.QueryGetMyRequestedTripsArgs, ctx, _info) => {
            const me = await Authorizer.query(ctx, Module.REQUESTED_TRIPS, Operation.RETRIEVE);
            const now = new Date();
            return await Server.db.collection<In.RequestedTrip & Ex.RequestedTrip>(Collection.REQUESTED_TRIPS).find({
                requesterId: me._id,
                "time.schedule": {
                    $gte: args.from || new Date(now.getTime() - Default.FILTER_TIME),
                    $lt: args.to || new Date(now.getTime() + Default.FILTER_TIME)
                }
            }).skip(args.skip ?? Default.VALUE_SKIP)
                .limit(args.limit ?? Default.VALUE_LIMIT)
                .toArray();
        },

        GetMyRequestedTrip: async (_parent, args: Ex.QueryGetMyRequestedTripArgs, ctx, _info) => {
            const me = await Authorizer.query(ctx, Module.REQUESTED_TRIPS, Operation.RETRIEVE);
            return await Validator.getIfExists<In.RequestedTrip & Ex.RequestedTrip>(Collection.REQUESTED_TRIPS, "requested trip", {
                _id: args._id,
                requesterId: me._id
            });
        },

        GetMyHandshakes: async (_parent, args: Ex.QueryGetMyHandshakesArgs, ctx, _info) => {
            const me = await Authorizer.query(ctx, Module.HANDSHAKES, Operation.RETRIEVE);

            const sentFilter: Filter<In.Handshake & Ex.Handshake> = {};
            if (args.sent === true) {
                //CASE: Filter handshakes sent by me
                sentFilter.senderId = me._id;
            } else if (args.sent === false) {
                //CASE: Filter handshakes received by me
                sentFilter.recipientId = me._id;
            } else {
                //CASE: Retrieve everything either sent or received by me
                sentFilter.$or = [
                    { senderId: me._id },
                    { recipientId: me._id }
                ];
            }

            const tripIdFilter: Filter<In.Handshake & Ex.Handshake> = {};
            if (args.tripId) {
                //NOTE: tripId could be a hostedTripId or a requestedTripId
                //CASE: Retrieve the handshake where hostedTripId=tripId or requestedTripId=tripId
                tripIdFilter.$or = [
                    { hostedTripId: args.tripId },
                    { requestedTripId: args.tripId }
                ];
            }

            const stateFilter: Filter<In.Handshake & Ex.Handshake> = {};
            if (args.state) {
                //CASE: Add a filter based on state

                //NOTE: To filter a handshake based on state,
                //1. If the filtering state itself is not CANCELLED, then there must be no time.cancelled field
                if (args.state !== Ex.HandshakeState.CANCELLED) {
                    stateFilter[`time.cancelled`] = {
                        "$exists": false
                    };
                }

                //2. There must be a time field related to that state
                stateFilter[`time.${Strings.screamingSnake2Camel(args.state)}`] = {
                    "$exists": true
                };
                
                //2. There must not be a time field related to the successive state
                //NOTE: DONE_PAYMENT and CANCELLED states don't need this because they don't have successive states
                switch (args.state) {
                    case Ex.HandshakeState.INITIATED:
                    case Ex.HandshakeState.SEEN:
                    case Ex.HandshakeState.ACCEPTED:
                    case Ex.HandshakeState.CONFIRMED_ACCEPTED:
                    case Ex.HandshakeState.STARTED_REQUESTED_TRIP:
                    case Ex.HandshakeState.CONFIRMED_STARTED_REQUESTED_TRIP:
                    case Ex.HandshakeState.ENDED_REQUESTED_TRIP:
                    case Ex.HandshakeState.CONFIRMED_ENDED_REQUESTED_TRIP: {
                        stateFilter[`time.${Strings.screamingSnake2Camel(Validator.getNextHandshakeState(args.state))}`] = {
                            "$exists": false
                        };

                        break;
                    }
                }
            }
            
            return await Server.db.collection<In.Handshake & Ex.Handshake>(Collection.HANDSHAKES).find({
                $and: [sentFilter, tripIdFilter, stateFilter]
            }).skip(args.skip ?? Default.VALUE_SKIP)
                .limit(args.limit ?? Default.VALUE_LIMIT)
                .toArray();
        },

        GetMyHandshake: async (_parent, args: Ex.QueryGetMyHandshakeArgs, ctx, _info) => {
            const me = await Authorizer.query(ctx, Module.HANDSHAKES, Operation.RETRIEVE);
            return await Validator.getIfExists<In.Handshake & Ex.Handshake>(Collection.HANDSHAKES, "handshake", {
                _id: args._id,
                $or: [
                    { senderId: me._id },
                    { recipientId: me._id }
                ]
            });
        },

        GetMatchingRequestedTrips: async (_parent, args: Ex.QueryGetMatchingRequestedTripsArgs, ctx, _info) => {
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
                //Try to match seat availability
                if (hostedTrip.remainingSeats < requestedTrip.seats) {
                    //CASE: Hosted trip doesn't have enough seats to fulfil requested trip
                    continue;
                }

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
        CreateGenericUser: async (_parent, args: Ex.MutationCreateGenericUserArgs, _ctx, _info) => {
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

        SignIn: async (_parent, args: Ex.MutationSignInArgs, _ctx, _info) => {
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

        AddVehicle: async (_parent, args: Ex.MutationAddVehicleArgs, ctx, _info) => {
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

        AddBankAccount: async (_parent, args: Ex.MutationAddBankAccountArgs, ctx, _info) => {
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

        AddHostedTrip: async (_parent, args: Ex.MutationAddHostedTripArgs, ctx, _info) => {
            const me = await Authorizer.query(ctx, Module.HOSTED_TRIPS, Operation.CREATE);
            const tripToBeInserted: In.HostedTripInput = {
                ...args.hostedTrip,
                hostId: me._id,
                vehicle: undefined,
                remainingSeats: args.hostedTrip.seats,
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

        AddRequestedTrip: async (_parent, args: Ex.MutationAddRequestedTripArgs, ctx, _info) => {
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

        InitHandshake: async (_parent, args: Ex.MutationInitHandshakeArgs, ctx, _info) => {
            const me = await Authorizer.query(ctx, Module.HANDSHAKES, Operation.CREATE);
            const hostedTrip = await Validator.getIfExists<In.HostedTrip>(Collection.HOSTED_TRIPS, "hosted trip", {
                _id: args.hostedTripId
            });
            const requestedTrip = await Validator.getIfExists<In.RequestedTrip>(Collection.REQUESTED_TRIPS, "requested trip", {
                _id: args.requestedTripId
            });

            const now = new Date();
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
                    initiated: now
                },
                route: {
                    intersectStartWkb: "", //NOTE: Will be calculated later
                    intersectEndWkb: "" //NOTE: Will be calculated later
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

            //Update intersectWkb values to proper values
            handshakeToBeInserted.route.intersectStartWkb = await PostGIS.calculateIntersectionPoints(hostedTrip.route.keyCoords[0] as [number, number], Default.PROXIMITY_RADIUS, hostedTrip.route.polyLines);

            handshakeToBeInserted.route.intersectEndWkb = await PostGIS.calculateIntersectionPoints(hostedTrip.route.keyCoords[hostedTrip.route.keyCoords.length - 1] as [number, number], Default.PROXIMITY_RADIUS, hostedTrip.route.polyLines);

            const result = await Server.db.collection<In.HandshakeInput>(Collection.HANDSHAKES).insertOne(handshakeToBeInserted);
            if (!result.acknowledged) {
                throw new Error.CouldNotPerformOperation(Module.REQUESTED_TRIPS, Operation.CREATE);
            }

            return result.insertedId;
        },

        UpdateHostedTripState: async (_parent, args: Ex.MutationUpdateHostedTripStateArgs, ctx, _info) => {
            const me = await Authorizer.query(ctx, Module.HOSTED_TRIPS, Operation.UPDATE);
            const now = new Date();
            const hostedTrip = await Validator.getIfExists<In.HostedTrip>(Collection.HOSTED_TRIPS, "hosted trip", {
                _id: args.hostedTripId
            });

            //Transform args.state to camel case
            const camelCaseState = Strings.screamingSnake2Camel(args.state) as keyof In.TripTime;

            //Check if hosted trip's host is me
            if (!hostedTrip.hostId.equals(me._id)) {
                throw new Error.ItemNotAccessibleByUser("handshake", "_id", args.hostedTripId.toHexString());
            }

            //Check if the hosted trip is already in the required state
            if (hostedTrip.time[camelCaseState]) {
                throw new Error.InvalidItemState("hosted trip", "_id", args.hostedTripId.toHexString(), args.state, `NOT ${args.state}`, args.state);
            }

            switch (args.state) {
                //WARNING: No need to handle this state. See reason below
                case Ex.TripState.STARTED: {
                    //NOTE: Done by host
                    //NOTE: Depends on hosted trip being not STARTED (Already checked globally)
                    //NOTE: Depends on the time is past the schedule
                    if (hostedTrip.time.schedule > now) {
                        throw new Error.InvalidAction("hosted trip", "_id", args.hostedTripId.toHexString(), "STARTING", "the scheduled time has not yet reached");
                    }

                    break;
                }

                case Ex.TripState.ENDED: {
                    //NOTE: Done by host
                    //NOTE: Depends all requested trips being CONFIRMED_REQUESTED_TRIP_END
                    //Get all handshakes that are accepted, not cancelled, not requested trip end confirmed
                    const handshakes = Server.db.collection<In.Handshake>(Collection.HANDSHAKES).find({
                        hostedTripId: args.hostedTripId,
                        "time.accepted": {
                            $exists: true
                        },
                        "time.confirmedRequestedTripEnd": {
                            $exists: false
                        },
                        "time.cancelled": {
                            $exists: false
                        },
                    });

                    //NOTE: For ENDED state to be succeeded, there must me no handshakes matching the above criteria
                    if (await handshakes.hasNext()) {
                        throw new Error.InvalidAction("hosted trip", "_id", args.hostedTripId.toHexString(), "ENDING", "there are ongoing requested trips");
                    }

                    break;
                }
            }

            //Validate given coordinate
            Validator.validateCoords([args.coord], "arguments", "coord");

            const result = await Server.db.collection<In.RequestedTrip>(Collection.REQUESTED_TRIPS).updateOne(
                { _id: hostedTrip._id },
                {
                    $set: {
                        [`time.${camelCaseState}`]: new Date(),
                        [`route.${camelCaseState}`]: args.coord
                    }
                }
            );
            return result.acknowledged;
        },

        UpdateHandshakeState: async (_parent, args: Ex.MutationUpdateHandshakeStateArgs, ctx, _info) => {
            const me = await Authorizer.query(ctx, Module.HANDSHAKES, Operation.UPDATE);
            const handshake = await Validator.getIfExists<In.Handshake>(Collection.HANDSHAKES, "handshake", {
                _id: args.handshakeId
            });

            //Transform args.state to camel case
            const camelCaseState = Strings.screamingSnake2Camel(args.state) as keyof In.HandshakeTime;

            //NOTE: Any updates are dependant on the handshake's state being not CANCELLED
            if (handshake.time.cancelled) {
                //CASE: Handshake is in CANCELLED state
                throw new Error.InvalidItemState("handshake", "_id", args.handshakeId.toHexString(), Ex.HandshakeState.CANCELLED, `NOT ${Ex.HandshakeState.CANCELLED}`, args.state);
            }

            //Check if the handshake is already in the required state
            if (handshake.time[camelCaseState]) {
                throw new Error.InvalidItemState("handshake", "_id", args.handshakeId.toHexString(), args.state, `NOT ${args.state}`, args.state);
            }

            switch (args.state) {
                case Ex.HandshakeState.INITIATED: {
                    //NOTE: Done by sender
                    //WANING: Cannot modify SENT state because every handshake is initially SENT
                    throw new Error.InvalidFieldValue("handshake", "state", args.state, `The ${Ex.HandshakeState.INITIATED} state of a handshake cannot be modified.`);
                }

                case Ex.HandshakeState.SEEN: {
                    //NOTE: Done by recipient
                    if (!handshake.recipientId.equals(me._id)) {
                        throw new Error.ItemNotAccessibleByUser("handshake", "_id", args.handshakeId.toHexString());
                    }
                    //NOTE: Dependant on the handshake's state being SENT
                    //Since SENT is always present, no need to check
                    break;
                }

                case Ex.HandshakeState.ACCEPTED: {
                    //NOTE: Done by recipient
                    if (!handshake.recipientId.equals(me._id)) {
                        throw new Error.ItemNotAccessibleByUser("handshake", "_id", args.handshakeId.toHexString());
                    }
                    //NOTE: Dependant on the handshake's state being SEEN
                    if (!handshake.time.seen) {
                        //CASE: Handshake is in SENT state
                        throw new Error.InvalidItemState("handshake", "_id", args.handshakeId.toHexString(), Ex.HandshakeState.INITIATED, Ex.HandshakeState.SEEN, Ex.HandshakeState.ACCEPTED);
                    }
                    //Decrease the hosted trip's remaining seats by the amount requested by requested trip
                    const requestedTrip = await Validator.getIfExists<In.RequestedTrip>(Collection.REQUESTED_TRIPS, "requested trip", {
                        _id: handshake.requestedTripId
                    });
                    await Server.db.collection<In.HostedTrip>(Collection.HOSTED_TRIPS).updateOne(
                        { _id: handshake.hostedTripId },
                        {
                            $inc: { remainingSeats: -requestedTrip.seats }
                        }
                    );
                    break;
                }

                case Ex.HandshakeState.CONFIRMED_ACCEPTED: {
                    //NOTE: Done by sender
                    if (!handshake.senderId.equals(me._id)) {
                        throw new Error.ItemNotAccessibleByUser("handshake", "_id", args.handshakeId.toHexString());
                    }
                    //NOTE: Dependant on the handshake's state being ACCEPTED
                    if (!handshake.time.seen) {
                        //CASE: Handshake is in SEEN state
                        throw new Error.InvalidItemState("handshake", "_id", args.handshakeId.toHexString(), Ex.HandshakeState.SEEN, Ex.HandshakeState.ACCEPTED, Ex.HandshakeState.CONFIRMED_ACCEPTED);
                    }
                    break;
                }

                case Ex.HandshakeState.STARTED_REQUESTED_TRIP: {
                    //Validate coord
                    if (!args.coord) {
                        throw new Error.InvalidFieldValue("arguments", "coord", "null", "a coordinate is required to start a requested trip");
                    }
                    Validator.validateCoords([args.coord], "arguments", "coord");

                    //NOTE: Done by host
                    const hostedTrip = await Validator.getIfExists<In.HostedTrip>(Collection.HOSTED_TRIPS, "hosted trip", {
                        _id: handshake.hostedTripId
                    });
                    if (!hostedTrip.hostId.equals(me._id)) {
                        throw new Error.ItemNotAccessibleByUser("handshake", "_id", args.handshakeId.toHexString());
                    }

                    //NOTE: Dependant on the hosted trip's state being STARTED
                    if (!hostedTrip.time.started) {
                        throw new Error.InvalidItemState("handshake", "_id", args.handshakeId.toHexString(), `NOT ${In.HandshakeState.STARTED_HOSTED_TRIP}`, In.HandshakeState.STARTED_HOSTED_TRIP, Ex.HandshakeState.STARTED_REQUESTED_TRIP);
                    }

                    //NOTE: Dependant on the handshake's state being CONFIRMED_ACCEPTED
                    if (!handshake.time.accepted) {
                        //CASE: Handshake is in ACCEPTED state
                        throw new Error.InvalidItemState("handshake", "_id", args.handshakeId.toHexString(), Ex.HandshakeState.ACCEPTED, Ex.HandshakeState.CONFIRMED_ACCEPTED, Ex.HandshakeState.STARTED_REQUESTED_TRIP);
                    }

                    //Also update requested trip.time & trip.route.started
                    await Server.db.collection<In.RequestedTrip>(Collection.REQUESTED_TRIPS).updateOne(
                        { _id: handshake.requestedTripId },
                        {
                            $set: {
                                "time.started": new Date(),
                                "route.started": args.coord
                            }
                        }
                    );

                    break;
                }

                case Ex.HandshakeState.CONFIRMED_STARTED_REQUESTED_TRIP: {
                    //NOTE: Done by requester
                    const requestedTrip = await Validator.getIfExists<In.RequestedTrip>(Collection.REQUESTED_TRIPS, "requested trip", {
                        _id: handshake.requestedTripId
                    });
                    if (!requestedTrip.requesterId.equals(me._id)) {
                        throw new Error.ItemNotAccessibleByUser("handshake", "_id", args.handshakeId.toHexString());
                    }
                    //NOTE: Dependant on the handshake's state being STARTED_REQUESTED_TRIP
                    if (!handshake.time.startedRequestedTrip) {
                        //CASE: Handshake is in ACCEPTED state
                        throw new Error.InvalidItemState("handshake", "_id", args.handshakeId.toHexString(), Ex.HandshakeState.ACCEPTED, Ex.HandshakeState.STARTED_REQUESTED_TRIP, Ex.HandshakeState.CONFIRMED_STARTED_REQUESTED_TRIP);
                    }
                    break;
                }

                case Ex.HandshakeState.ENDED_REQUESTED_TRIP: {
                    //Validate coord
                    if (!args.coord) {
                        throw new Error.InvalidFieldValue("arguments", "coord", "null", "a coordinate is required to end a requested trip");
                    }
                    Validator.validateCoords([args.coord], "arguments", "coord");

                    //NOTE: Done by requester
                    const requestedTrip = await Validator.getIfExists<In.RequestedTrip>(Collection.REQUESTED_TRIPS, "requested trip", {
                        _id: handshake.requestedTripId
                    });
                    if (!requestedTrip.requesterId.equals(me._id)) {
                        throw new Error.ItemNotAccessibleByUser("handshake", "_id", args.handshakeId.toHexString());
                    }
                    //NOTE: Dependant on the handshake's state being CONFIRMED_REQUESTED_TRIP_START
                    if (!handshake.time.confirmedRequestedTripStart) {
                        //CASE: Handshake is in STARTED_REQUESTED_TRIP state
                        throw new Error.InvalidItemState("handshake", "_id", args.handshakeId.toHexString(), Ex.HandshakeState.STARTED_REQUESTED_TRIP, Ex.HandshakeState.CONFIRMED_STARTED_REQUESTED_TRIP, Ex.HandshakeState.ENDED_REQUESTED_TRIP);
                    }

                    //Also update requested trip.time
                    await Server.db.collection<In.RequestedTrip>(Collection.REQUESTED_TRIPS).updateOne(
                        { _id: handshake.requestedTripId },
                        {
                            $set: {
                                "time.started": new Date(),
                                "route.started": args.coord
                            }
                        }
                    );

                    break;
                }

                case Ex.HandshakeState.CONFIRMED_ENDED_REQUESTED_TRIP: {
                    //NOTE: Done by host
                    const hostedTrip = await Validator.getIfExists<In.HostedTrip>(Collection.HOSTED_TRIPS, "hosted trip", {
                        _id: handshake.hostedTripId
                    });
                    if (!hostedTrip.hostId.equals(me._id)) {
                        throw new Error.ItemNotAccessibleByUser("handshake", "_id", args.handshakeId.toHexString());
                    }
                    //NOTE: Dependant on the handshake's state being ENDED_REQUESTED_TRIP
                    if (!handshake.time.endedRequestedTrip) {
                        //CASE: Handshake is in CONFIRMED_REQUESTED_TRIP_START state
                        throw new Error.InvalidItemState("handshake", "_id", args.handshakeId.toHexString(), Ex.HandshakeState.CONFIRMED_STARTED_REQUESTED_TRIP, Ex.HandshakeState.ENDED_REQUESTED_TRIP, Ex.HandshakeState.CONFIRMED_ENDED_REQUESTED_TRIP);
                    }
                    break;
                }

                case Ex.HandshakeState.DONE_PAYMENT: {
                    //NOTE: Done by host
                    const hostedTrip = await Validator.getIfExists<In.HostedTrip>(Collection.HOSTED_TRIPS, "hosted trip", {
                        _id: handshake.hostedTripId
                    });
                    if (!hostedTrip.hostId.equals(me._id)) {
                        throw new Error.ItemNotAccessibleByUser("handshake", "_id", args.handshakeId.toHexString());
                    }
                    //NOTE: Dependant on the handshake's state being CONFIRMED_REQUESTED_TRIP_END
                    if (!handshake.time.confirmedRequestedTripEnd) {
                        //CASE: Handshake is in ENDED_REQUESTED_TRIP state
                        throw new Error.InvalidItemState("handshake", "_id", args.handshakeId.toHexString(), Ex.HandshakeState.ENDED_REQUESTED_TRIP, Ex.HandshakeState.CONFIRMED_ENDED_REQUESTED_TRIP, Ex.HandshakeState.DONE_PAYMENT);
                    }
                    break;
                }

                case Ex.HandshakeState.CANCELLED: {
                    //NOTE: Done by host/recipient
                    if (!handshake.senderId.equals(me._id) || !handshake.recipientId.equals(me._id)) {
                        //CASE: I'm not either host or recipient
                        throw new Error.ItemNotAccessibleByUser("handshake", "_id", args.handshakeId.toHexString());
                    }
                    //NOTE: Dependant on the handshake's state being INITIATED
                    //NOTE: Since INITIATED state is always present, no need to check for its dependency

                    //Increase the hosted trip's remaining seats by the amount requested by requested trip
                    const requestedTrip = await Validator.getIfExists<In.RequestedTrip>(Collection.REQUESTED_TRIPS, "requested trip", {
                        _id: handshake.requestedTripId
                    });
                    await Server.db.collection<In.HostedTrip>(Collection.HOSTED_TRIPS).updateOne(
                        { _id: handshake.hostedTripId },
                        {
                            $inc: { remainingSeats: requestedTrip.seats }
                        }
                    );
                    break;
                }
            }

            const fieldToBeUpdated = `time.${camelCaseState}`;
            const result = await Server.db.collection<In.Handshake>(Collection.HANDSHAKES).updateOne(
                { _id: handshake._id },
                {
                    $set: { [fieldToBeUpdated]: new Date() }
                }
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
        route: async (parent, _args, _ctx, _info) => parent.route,

        host: async (parent, _args, ctx, _info) => {
            await Authorizer.query(ctx, Module.USERS, Operation.RETRIEVE);
            return await Validator.getIfExists<In.User>(Collection.USERS, "user/host", {
                _id: parent.hostId
            });
        },

        vehicle: async (parent, _args, ctx, _info) => {
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

        billing: async (parent, _args, _ctx, _info) => {
            return {
                ...parent.billing,
                bankAccount: {} as Ex.BankAccount
            }
        },

        hasHandshakes: async (parent, _args, ctx, _info) => {
            await Authorizer.query(ctx, Module.HANDSHAKES, Operation.RETRIEVE);
            return Server.db.collection<In.Handshake>(Collection.HANDSHAKES).find({
                hostedTripId: parent._id,
            }).hasNext();
        },
    },

    TripBilling: {
        bankAccount: async (parent, _args, ctx, _info) => {
            await Authorizer.query(ctx, Module.BANK_ACCOUNTS, Operation.RETRIEVE);
            return await Validator.getIfExists<In.BankAccount>(Collection.BANK_ACCOUNTS, "bank account", {
                _id: parent.bankAccountId
            });
        },
    },

    RequestedTrip: {
        route: async (parent, _args, _ctx, _info) => parent.route,

        requester: async (parent, _args, ctx, _info) => {
            await Authorizer.query(ctx, Module.USERS, Operation.RETRIEVE);
            return await Validator.getIfExists<In.User>(Collection.USERS, "user/requester", {
                _id: parent.requesterId
            });
        },

        hasHandshakes: async (parent, _args, ctx, _info) => {
            await Authorizer.query(ctx, Module.HANDSHAKES, Operation.RETRIEVE);
            return Server.db.collection<In.Handshake>(Collection.HANDSHAKES).find({
                requestedTripId: parent._id,
            }).hasNext();
        },
    },

    Handshake: {
        sender: async (parent, _args, ctx, _info) => {
            await Authorizer.query(ctx, Module.USERS, Operation.RETRIEVE);
            return await Validator.getIfExists<In.User>(Collection.USERS, "user/sender", {
                _id: parent.senderId
            });
        },

        recipient: async (parent, _args, ctx, _info) => {
            await Authorizer.query(ctx, Module.USERS, Operation.RETRIEVE);
            return await Validator.getIfExists<In.User>(Collection.USERS, "user/recipient", {
                _id: parent.recipientId
            });
        },

        hostedTrip: async (parent, _args, ctx, _info) => {
            await Authorizer.query(ctx, Module.HOSTED_TRIPS, Operation.RETRIEVE);
            return await Validator.getIfExists<In.HostedTrip & Ex.HostedTrip>(Collection.HOSTED_TRIPS, "hosted trip", {
                _id: parent.hostedTripId
            });
        },

        requestedTrip: async (parent, _args, ctx, _info) => {
            await Authorizer.query(ctx, Module.REQUESTED_TRIPS, Operation.RETRIEVE);
            return await Validator.getIfExists<In.RequestedTrip & Ex.RequestedTrip>(Collection.REQUESTED_TRIPS, "requested trip", {
                _id: parent.requestedTripId
            });
        },
    },
};