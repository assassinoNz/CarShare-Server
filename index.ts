import { Server } from "./lib/app";

//Make database connectivity
Server.connectToDatabase().catch(err => {
    console.error({
        component: "Database Driver",
        status: false,
        error: err.message
    });
});

//Start HTTP server
Server.start();