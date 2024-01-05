import { Server } from "./src/app.js";

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
        error: err
    });
});
