import { CodegenConfig } from "@graphql-codegen/cli";

const config: CodegenConfig = {
    overwrite: true,
    config: {
        preResolveTypes: true,
        namingConvention: "keep",
        nonOptionalTypename: false,
        skipTypeNameForRoot: true,
    },
    generates: {
        "graphql/internal.ts": {
            schema: "graphql/internal.graphql",
            config: {
                template: "imports.ts",
                scalars: {
                    ObjectId: "ObjectId",
                    Date: "Date",
                },
            },
            plugins: [
                "typescript",
                { add: { content: "import { ObjectId } from 'mongodb';" } },
            ],
        },
        "graphql/external.ts": {
            schema: "graphql/external.graphql",
            config: {
                template: "imports.ts",
                scalars: {
                    ObjectId: "ObjectId",
                    Date: "Date",
                },
            },
            plugins: [
                "typescript",
                { add: { content: "import { ObjectId } from 'mongodb';" } },
            ],
        },
        "etc/graphql.ts": {
            schema: "graphql/external.graphql",
            config: {
                template: "imports.ts",
                scalars: {
                    ObjectId: "string",
                    Date: "number",
                },
            },
            plugins: ["typescript"],
        },
    },
};

export default config;