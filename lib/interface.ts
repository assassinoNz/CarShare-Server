import * as Internal from "../graphql/internal";

export interface CustomErrorDetails {
    message: string,
    title: string,
    suggestion: string,
    description: string,
    code: string
}

export interface Context {
    user: Internal.User | null;
}

export type Resolver<InternalParent, ExternalParent> = {
    [K in keyof ExternalParent]: (parent: InternalParent, args: any, ctx: Context, info: any) => Promise<ExternalParent[K]>;
}