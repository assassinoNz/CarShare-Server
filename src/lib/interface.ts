import * as In from "../graphql/internal";
import * as Ex from "../graphql/external";
import { Resolved } from "../graphql/resolver";

export interface JwtPayload {
    userId: string;
}

export interface Context {
    user: In.User | null;
}

/**
 * Maps every field of a type to its corresponding promise resolver
**/
export type RootResolver<InParent, ExParent> = {
    [K in keyof ExParent]: (parent: InParent, args: any, ctx: Context, info: any) => Promise<ExParent[K]>;
}

/**
 * Returns the type after removing every field of ExParent that share the same field name and field type with InParent.
 * Additionally, if the field's type is in Resolved, it is also removed
**/
//Is ExKey also a key of InParent?
    //Yes -> Is type of ExKey within ExParent equals type of ExKey within InParent or equals any of types of Resolved
        //Yes -> Remove ExKey from ExParent
        //No -> Keep ExKey
    //No -> Keep ExKey
type ExUnique<InParent, ExParent> = {
    [ExKey in keyof ExParent as (
        ExKey extends keyof InParent ? (ExParent[ExKey] extends (InParent[ExKey] | Resolved) ? never : ExKey) : ExKey
    )]: ExParent[ExKey];
};

//Maps every field of a type to its corresponding promise resolver after removing the scalar fields
export type TypeResolver<InParent, ExParent> = {
    [K in keyof ExUnique<InParent, ExParent>]: (parent: InParent, args: any, ctx: Context, info: any) => Promise<ExUnique<InParent, ExParent>[K]>;
}