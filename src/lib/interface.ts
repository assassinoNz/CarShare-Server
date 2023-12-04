import * as In from "../graphql/internal";

export interface JwtPayload {
    userId: string;
}

export interface Context {
    user: In.User | null;
}

/**
 * Represents a GraphQL promise resolver
**/
type Resolver<Parent, Ret> = (parent: Parent, args: any, ctx: Context, info: any) => Promise<Ret>

/**
 * Maps every field of a type to its corresponding promise resolver
**/
export type RootResolver<In, Ex> = {
    [K in keyof Ex]: Resolver<In, Ex[K]>;
}

/**
 * Returns the type after removing every field of ExParent that share the same field name and field type with InParent.
**/
//For every key K of ExParent...
//Is K also a key of InParent?
    //Yes -> Is type of K within ExParent equals type of K within InParent
        //Yes -> Remove K
        //No -> Keep K
    //No -> Keep K
type ExUnique<In, Ex> = {
    [K in keyof Ex as (
        K extends keyof In ? ((Ex[K] | In[K]) extends (Ex[K] & In[K]) ? never : K) : K
    )]: Ex[K];
};

//Maps every field of a type to its corresponding promise resolver after removing the types with same name and type compared to InParent and ExParent
export type TypeResolver<In, Ex> = {
    [K in keyof ExUnique<In, Ex>]: Resolver<In, ExUnique<In, Ex>[K]>;
}