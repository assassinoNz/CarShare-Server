import { Server } from "./src/lib/app";

//Make database connectivity
Server.connectDatabaseDrivers().catch(err => {
    console.error({
        component: "Database Driver",
        status: false,
        error: err.message
    });
});

//Start HTTP server
Server.start();