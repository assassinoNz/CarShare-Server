import { Server } from "./src/lib/app";

Promise.all([
    Server.connectPostgresDriver(),
    Server.connectMongoDriver(),
    Server.startAuthenticator(),
]).then(() => {
    Server.start();
}).catch(err => {
    console.log({
        component: "Server",
        status: false,
        error: "Server failed to start due to the above logged errors"
    });
});
