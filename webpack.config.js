import * as path from "path";

export default {
    entry: {
        index: "./index.ts"
    },
    mode: "production",
    module: {
        rules: [
            {
                test: /\.ts$/,
                use: "ts-loader",
                exclude: /node_modules/
            },
        ]
    },
    resolve: {
        extensions: [".ts", ".js"]
    },
    plugins: [],
    output: {
        filename: "[name].js",
        path: path.resolve(__dirname),
    }
};