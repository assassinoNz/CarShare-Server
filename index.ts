import { Server } from "./src/lib/app";

Server.connectPostgresDriver();
Server.connectMongoDriver();
Server.start();