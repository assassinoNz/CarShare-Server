import * as Internal from "../graphql/internal";

export interface JwtValue {
    userId: string;
}

export interface Context {
    user: Internal.User | null;
}

export type Resolver<InternalParent, ExternalParent> = {
    [K in keyof ExternalParent]: (parent: InternalParent, args: any, ctx: Context, info: any) => Promise<ExternalParent[K]>;
}