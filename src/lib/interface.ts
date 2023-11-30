import { ObjectId } from "mongodb";
import * as In from "../graphql/internal";
import * as Ex from "../graphql/external";

export interface JwtPayload {
    userId: string;
}

export interface Context {
    user: In.User | null;
}

//Maps every field of a type to its corresponding promise resolver
export type RootResolver<InParent, ExParent> = {
    [K in keyof ExParent]: (parent: InParent, args: any, ctx: Context, info: any) => Promise<ExParent[K]>;
}

//NOTE: These type of fields are considered as fields that need not to be resolved.
//Because they are embedded with their parent types within the database
type NonResolved = 
    boolean | number | string | ObjectId | Date |
    Ex.TripBilling | Ex.Route | Ex.TripTime | Ex.Payment | Ex.TripRating | Ex.HandshakeTime;

//Removes fields with that doesn't need resolvers
//NOTE: The scalar types are boolean, number, string, ObjectId, Date
type RemoveNonResolved<Parent> = {
    [K in keyof Parent as Parent[K] extends NonResolved ? never : K]: Parent[K];
};

//Maps every field of a type to its corresponding promise resolver after removing the scalar fields
export type TypeResolver<InParent, ExParent> = {
    [K in keyof RemoveNonResolved<ExParent>]: (parent: InParent, args: any, ctx: Context, info: any) => Promise<RemoveNonResolved<ExParent>[K]>;
}