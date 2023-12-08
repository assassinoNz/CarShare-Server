import fetch from "node-fetch";
import * as GraphQLType from "./graphql";
import * as Config from "../config";
import { OsrmRoute } from "../src/lib/interface";
import { CharGroup } from "./const";

export class Requester {
    static fetch<Input, Output>(url: string, jwt: string, query: string, variables: Input) {
        return fetch(url, {
            method: "POST",
            headers: {
                "Authorization": jwt,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                query,
                variables
            })
        })
            .then(res => res.json())
            .then(res => {
                if (res.data) {
                    return res.data.result as Output;
                } else {
                    throw res.errors[0];
                }
            }).catch(err => {
                console.error(err);
                throw new Error(`ERR_FETCH: ${url}`);
            });
    }
}

export class PostGIS {
    //Boundary of Sri Lanka as returned by Nominatim
    //Longitudes, X coords
    static readonly LONG_LEFT = 79.4219890;
    static readonly LONG_RIGHT = 82.0810141;
    //Latitudes, Y coords
    static readonly LAT_TOP = 10.0350000;
    static readonly LAT_BOTTOM = 5.7190000;

    /**
     * @param coords An array of arrays with each array representing a coordinate as [lat, long]
    */
    static makePolyString(coords: number[][]) {
        let polyString = "POLYGON((";
        for (const coord of coords) {
            polyString += coord[1];
            polyString += " ";
            polyString += coord[0];
            polyString += ",";
        }
        polyString = polyString.slice(0, -1);
        polyString += "))";

        return polyString;
    }
}

export class Osrm {
    /**
     * @param coords An array of arrays with each array representing a coordinate as [lat, long]
    */
    static calculatePossibleRoutes(coords: number[][]) {
        //NOTE: Deep copy coords because we're reversing each coord
        coords = JSON.parse(JSON.stringify(coords));

        return fetch(`${Config.URL_OSRM}/${coords.map(coord => coord.reverse().join(",")).join(";")}?overview=false&steps=true`)
            .then((res: any) => res.json())
            .then((res: any) => res.routes as OsrmRoute[]);
    }

    static extractRoutePolyLines(route: OsrmRoute) {
        const polyLines: string[] = [];

        for (const leg of route.legs) {
            for (const step of leg.steps) {
                polyLines.push(step.geometry);
            }
        }

        return polyLines;
    }
}

export class Nominatim {
    static geocode(coord: [number, number]) {
        return fetch(`${Config.URL_NOMINATIM}/reverse?format=json&lat=${coord[0]}&lon=${coord[1]}`).then(res => res.json())
        .then(res => {
            if (res.error) {
                throw res.error;
            } else {
                return res.display_name as string;
            }
        });
    }
}

export class GraphQlInput {
    static async hostedTrip(bankAccounts: GraphQLType.BankAccount[], vehicles: GraphQLType.Vehicle[]) {
        const randKeyCoords = [Random.coord(), Random.coord()];
        const vehicleIdOverVehicle = Math.random();
    
        const input: GraphQLType.HostedTripInput = {
            route: {
                from: await Nominatim.geocode(randKeyCoords[0]),
                to: await Nominatim.geocode(randKeyCoords[1]),
                keyCoords: randKeyCoords,
                polyLines: Osrm.extractRoutePolyLines((await Osrm.calculatePossibleRoutes(randKeyCoords))[0])
            },
            billing: {
                bankAccountId: Random.pick(bankAccounts)._id,
                priceFirstKm: Random.float(0, 1000),
                priceNextKm: Random.float(0, 1000),
            },
            seats: Random.int(1, 5),
            time: {
                schedule: new Date().getTime() + Random.int(-2592000000, 2592000000)
            },
            vehicleId: vehicleIdOverVehicle > 0.5 ? Random.pick(vehicles)._id : undefined,
            vehicle: vehicleIdOverVehicle > 0.5 ? undefined : GraphQlInput.vehicle()
        }
    
        return input;
    }
    
    static async requestedTrip() {
        const randKeyCoords = [Random.coord(), Random.coord()];
    
        const input: GraphQLType.RequestedTripInput = {
            route: {
                from: await Nominatim.geocode(randKeyCoords[0]),
                to: await Nominatim.geocode(randKeyCoords[1]),
                keyCoords: randKeyCoords,
            },
            seats: Random.int(1, 5),
            time: {
                schedule: new Date().getTime() + Random.int(-2592000000, 2592000000)
            },
            vehicleFeatures: {
                ac: Random.partialBool(),
                luggage: Random.partialBool()
            }
        }
    
        return input;
    }
    
    static vehicle() {
        const input: GraphQLType.VehicleInput = {
            class: Random.enumVal(GraphQLType.VehicleClass),
            features: {
                ac: Random.bool(),
                luggage: Random.bool()
            },
            model: Random.string(),
            name: Random.string(),
            number: Random.string(),
            type: Random.enumVal(GraphQLType.VehicleType)
        };
    
        return input;
    }

    static bankAccount() {
        const input: GraphQLType.BankAccountInput = {
            bank: Random.string(),
            branch: Random.string(),
            name: Random.string(),
            number: Random.string(CharGroup.NUMBER, 10, 20),
        }

        return input;
    }
}

export class Random {
    static enumVal<T extends { [s: string]: unknown; }>(enumeration: T): T[keyof T] {
        const values = Object.values(enumeration);
        const randomIndex = Math.floor(Math.random() * values.length);
        return values[randomIndex] as T[keyof T];
    }
    
    static int(min: number, max: number): number {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min)) + min;
    }
    
    static float(min: number, max: number): number {
        return Math.random() * (max - min) + min;
    }
    
    static string(
        characters = CharGroup.UPPER + CharGroup.LOWER + CharGroup.SPACE,
        minLength = 3,
        maxLength = 20
    ): string {
        let randString = "";
        for (let i = 0; i < this.int(minLength, maxLength); i++) {
            randString += characters.charAt(this.int(0, characters.length));
        }
        return randString;
    }
    
    static bool() {
        return Math.random() < 0.5 ? true : false;
    }
    
    static partialBool() {
        const rand = Math.random();
    
        if (rand < 0.33) {
            return true;
        } else if (rand < 0.66) {
            return undefined;
        } else {
            return false;
        }
    }
    
    static pick<T>(array: T[]) {
        return array[this.int(0, array.length - 1)];
    }
    
    static coord(): [number, number] {
        return [this.float(PostGIS.LAT_BOTTOM, PostGIS.LAT_TOP), this.float(PostGIS.LONG_RIGHT, PostGIS.LONG_LEFT)];
    }
}