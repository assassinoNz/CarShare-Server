import { exec } from "node:child_process";
import pg from "pg";
import * as GraphQLType from "./graphql.js";
import * as Config from "../config.js";
import { GraphQlInput, Nominatim, Osrm, PostGIS, Random, Requester } from "./util.js";

export class Init {
    static buildMongoDatabase() {
        exec("mongosh --file etc/db.mongodb", (error, stdout, stderr) => {
            if (error) {
                console.log(error.message);
                return;
            }
            if (stderr) {
                console.log(stderr);
                return;
            }
            console.log(stdout);
        });
    }

    static async buildTilesTable(numTilesX: number, numTilesY: number) {
        const postgresDriver = new pg.Client({
            host: Config.HOST_POSTGRES,
            user: Config.USER_POSTGRES,
            password: Config.PASSWORD_POSTGRES,
            database: Config.DB_POSTGRES,
            port: Config.PORT_POSTGRES,
        });

        //Calculate needed distance between two longitudes
        const tileWidth = (PostGIS.LONG_RIGHT - PostGIS.LONG_LEFT) / numTilesX;
        const longitudes: number[] = [PostGIS.LONG_LEFT];
        for (let c = 1; c <= numTilesX; c++) {
            //NOTE: Longitude value is increasing from left to right
            longitudes[c] = longitudes[c - 1] + tileWidth;
        }

        //Calculate needed distance between two latitudes
        const tileHeight = (PostGIS.LAT_TOP - PostGIS.LAT_BOTTOM) / numTilesY;
        const latitudes: number[] = [PostGIS.LAT_TOP];
        for (let r = 1; r <= numTilesY; r++) {
            //NOTE: Latitude value is decreasing from top to bottom
            latitudes[r] = latitudes[r - 1] - tileHeight;
        }

        let values = [];
        for (let c = 0; c < longitudes.length - 1; c++) {
            for (let r = 0; r < latitudes.length - 1; r++) {
                values.push(`(ST_GeomFromText('${PostGIS.makePolyString([
                    //NOTE: makePolyString requires array of [lat, long] arrays
                    //So first value must be the row and second value is column
                    //This is achieved by reversing
                    [longitudes[c], latitudes[r]].reverse(),
                    [longitudes[c + 1], latitudes[r]].reverse(),
                    [longitudes[c + 1], latitudes[r + 1]].reverse(),
                    [longitudes[c], latitudes[r + 1]].reverse(),
                    [longitudes[c], latitudes[r]].reverse(),
                ])}', 4326))`);
            }
        }

        await postgresDriver.connect();

        const query1 = "DROP TABLE IF EXISTS tiles;";
        const result1 = await postgresDriver.query(query1);
        console.log(result1);

        const query2 = `
            CREATE TABLE tiles (
                id SERIAL PRIMARY KEY,
                geom GEOMETRY(Polygon, 4326)
            );
        `;
        const result2 = await postgresDriver.query(query2);
        console.log(result2);

        const query3 = `INSERT INTO tiles (geom) VALUES ` + values.join(",") + ";";
        const result3 = await postgresDriver.query(query3);
        console.log(result3);

        await postgresDriver.end();
    }
}

export class GraphQLProcedure {
    static async AddBankAccounts(url: string, jwt: string, count = 10) {
        for (let i = 0; i < count; i++) {
            try {
                const result = await Requester.fetch<GraphQLType.MutationAddBankAccountArgs, GraphQLType.Mutation["AddBankAccount"]>(
                    url,
                    jwt,
                    `mutation Mutation($bankAccount: BankAccountInput!) {
                        result: AddBankAccount(bankAccount: $bankAccount)
                    }`,
                    {
                        bankAccount: GraphQlInput.bankAccount()
                    }
                );

                console.log(result);
            } catch (err) {
                console.error(err);
            }
        }
    }

    static async AddVehicles(url: string, jwt: string, count = 10) {
        for (let i = 0; i < count; i++) {
            try {
                const result = await Requester.fetch<GraphQLType.MutationAddVehicleArgs, GraphQLType.Mutation["AddVehicle"]>(
                    url,
                    jwt,
                    `mutation Mutation($vehicle: VehicleInput!) {
                        result: AddVehicle(vehicle: $vehicle)
                    }`,
                    {
                        vehicle: GraphQlInput.vehicle()
                    }
                );

                console.log(result);
            } catch (err) {
                console.error(err);
            }
        }
    }

    static async AddRequestedTrips(url: string, jwt: string, count = 10) {
        for (let i = 0; i < count; i++) {
            try {
                const result = await Requester.fetch<GraphQLType.MutationAddRequestedTripArgs, GraphQLType.Mutation["AddRequestedTrip"]>(
                    url,
                    jwt,
                    `mutation AddRequestedTrip($requestedTrip: RequestedTripInput!) {
                        result: AddRequestedTrip(requestedTrip: $requestedTrip)
                    }`,
                    {
                        requestedTrip: await GraphQlInput.requestedTrip()
                    }
                );

                console.log(result);
            } catch (err) {
                console.error(err);
            }
        }
    }

    static async AddHostedTrips(url: string, jwt: string, count = 10) {
        const bankAccounts = await Requester.fetch<null, GraphQLType.Query["GetMyBankAccounts"]>(
            url,
            jwt,
            `query GetMyBankAccounts {
                result: GetMyBankAccounts {
                _id
                }
            }`,
            null
        );

        const vehicles = await Requester.fetch<null, GraphQLType.Query["GetMyVehicles"]>(
            url,
            jwt,
            `query GetMyVehicles {
                result: GetMyVehicles {
                _id
                }
            }`,
            null
        );

        for (let i = 0; i < count; i++) {
            try {
                const result = await Requester.fetch<GraphQLType.MutationAddHostedTripArgs, GraphQLType.Mutation["AddHostedTrip"]>(
                    url,
                    jwt,
                    `mutation Mutation($hostedTrip: HostedTripInput!) {
                        result: AddHostedTrip(hostedTrip: $hostedTrip)
                    }`,
                    {
                        hostedTrip: await GraphQlInput.hostedTrip(bankAccounts, vehicles)
                    }
                );

                console.log(result);
            } catch (err) {
                console.error(err);
            }
        }
    }
}

export class GraphQLTest {
    static NominatimTest(url: string, jwt: string, term = "Hatch colombo") {
        fetch(`${url}?format=json&q=${encodeURIComponent(term)}`, {
            method: "GET",
            headers: {
                "Authorization": jwt
            }
        })
            .then((response: any) => response.text())
            .then((data: any) => {
                console.log(data);
            })
            .catch(error => {
                console.error(error);
                throw error;
            });
    }

    static OsrmTest(url: string, jwt: string, coords = [
        [7.091540697723802, 79.9947859108097],
        [7.034742366985356, 80.02610573596573]
    ]) {
        //NOTE: Deep copy coords because we're reversing each coord
        coords = JSON.parse(JSON.stringify(coords));

        fetch(`${url}/${coords.map(coord => coord.reverse().join(",")).join(";")}?overview=false&steps=true`, {
            method: "GET",
            headers: {
                "Authorization": jwt
            }
        })
            .then((response: any) => response.text())
            .then((data: any) => {
                console.log(data);
            })
            .catch(error => {
                console.error(error);
                throw error;
            });
    }

    static async AddHostedTrip(url: string, jwt: string) {
        const keyCoords: [number, number][] = [
            [7.091540697723802, 79.9947859108097],//Gampaha
            [7.034742366985356, 80.02610573596573]//Weliveriya
        ];

        try {
            const result = await Requester.fetch<GraphQLType.MutationAddHostedTripArgs, GraphQLType.Mutation["AddHostedTrip"]>(
                url,
                jwt,
                `mutation Mutation($hostedTrip: HostedTripInput!) {
                    result: AddHostedTrip(hostedTrip: $hostedTrip)
                }`,
                {
                    hostedTrip: {
                        route: {
                            from: await Nominatim.geocode(keyCoords[0]),
                            to: await Nominatim.geocode(keyCoords[1]),
                            keyCoords: keyCoords,
                            polyLines: Osrm.extractRoutePolyLines((await Osrm.calculatePossibleRoutes(keyCoords))[0])
                        },
                        billing: {
                            bankAccountId: "500000000000000000000000",
                            priceFirstKm: Random.float(0, 1000),
                            priceNextKm: Random.float(0, 1000),
                        },
                        seats: Random.int(1, 5),
                        time: {
                            schedule: new Date().getTime()
                        },
                        vehicleId: "300000000000000000000000"
                    }
                }
            );

            console.log(result);
        } catch (err) {
            console.error(err);
        }
    }

    static async AddMatchingRequestedTrip(url: string, jwt: string) {
        const keyCoords: [number, number][] = [
            [7.092252219283498, 79.99299056862273],//Gampaha
            [7.072965706899689, 80.01593012768988] //Miriswatta
        ];
        try {
            const result = await Requester.fetch<GraphQLType.MutationAddRequestedTripArgs, GraphQLType.Mutation["AddRequestedTrip"]>(
                url,
                jwt,
                `mutation AddRequestedTrip($requestedTrip: RequestedTripInput!) {
                    result: AddRequestedTrip(requestedTrip: $requestedTrip)
                }`,
                {
                    requestedTrip: {
                        route: {
                            from: await Nominatim.geocode(keyCoords[0]),
                            to: await Nominatim.geocode(keyCoords[1]),
                            keyCoords: keyCoords,
                        },
                        seats: Random.int(1, 5),
                        time: {
                            schedule: new Date().getTime()
                        },
                        vehicleFeatures: {
                            ac: false,
                            luggage: false
                        }
                    }
                }
            );

            console.log(result);
        } catch (err) {
            console.error(err);
        }
    }

    static async AddNonMatchingRequestedTrip(url: string, jwt: string) {
        const keyCoords: [number, number][] = [
            [7.093563000632659, 79.99366001117367],//Gampaha
            [7.086064813422777, 80.03345207112561] //Yakkala
        ];
        try {
            const result = await Requester.fetch<GraphQLType.MutationAddRequestedTripArgs, GraphQLType.Mutation["AddRequestedTrip"]>(
                url,
                jwt,
                `mutation AddRequestedTrip($requestedTrip: RequestedTripInput!) {
                    result: AddRequestedTrip(requestedTrip: $requestedTrip)
                }`,
                {
                    requestedTrip: {
                        route: {
                            from: await Nominatim.geocode(keyCoords[0]),
                            to: await Nominatim.geocode(keyCoords[1]),
                            keyCoords: keyCoords,
                        },
                        seats: Random.int(1, 5),
                        time: {
                            schedule: new Date().getTime()
                        },
                        vehicleFeatures: {
                            ac: false,
                            luggage: false
                        }
                    }
                }
            );

            console.log(result);
        } catch (err) {
            console.error(err);
        }
    }
}