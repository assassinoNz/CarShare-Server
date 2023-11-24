import * as In from "../graphql/internal";

export interface JwtValue {
    userId: string;
}

export interface Context {
    user: In.User | null;
}

export type Resolver<InParent, ExParent> = {
    [K in keyof ExParent]: (parent: InParent & ExParent, args: any, ctx: Context, info: any) => Promise<ExParent[K]>;
}