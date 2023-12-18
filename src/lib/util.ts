import * as wkx from "wkx";
import pl from "@googlemaps/polyline-codec";

import * as Error from "./error.js";
import * as Config from "../../config.js";
import * as In from "../graphql/internal.js";
import * as Ex from "../graphql/external.js";
import { Server } from "./app.js";
import { ModuleId, OperationIndex, PossibleModule, PossibleOperation } from "./enum.js";
import { Context, OsrmRoute } from "./interface.js";
import { Document, Filter } from "mongodb";

export class Strings {
    static screamingSnake2Camel(screamingSnakeCase: string) {
        return screamingSnakeCase.toLowerCase()
            .split("_")
            .map((word, index) => index !== 0 ? word[0].toUpperCase() + word.slice(1) : word)
            .join("");
    }
}

export class Validator {
    static async getIfExists<C extends Document>(collection: string, itemType: string, filter: Filter<C>) {
        const item = await Server.db.collection<C>(collection).findOne(filter);

        if (!item) {
            const key = Object.keys(filter)[0];
            const keyValue = filter[key];
            throw new Error.ItemDoesNotExist(itemType, key, keyValue.toString());
        }

        return item;
    }

    static async getIfActive<C extends Document>(collection: string, itemType: string, filter: Filter<C>) {
        const item = await this.getIfExists(collection, itemType, filter);

        if (!item.isActive) {
            const key = Object.keys(filter)[0];
            const keyValue = filter[key];
            throw new Error.ItemIsNotActive(itemType, key.toString(), keyValue);
        }

        return item;
    }

    static validateCoords(coords: number[][], itemType: string, key: string) {
        //NOTE: Within the boundary of Sri Lanka, for every coordinate, latitude < longitude
        for (const coord of coords) {
            if (
                coord.length !== 2 ||
                coord[0] > PostGIS.LAT_TOP ||
                coord[0] < PostGIS.LAT_BOTTOM ||
                coord[1] > PostGIS.LONG_RIGHT ||
                coord[1] < PostGIS.LONG_LEFT
            ) {
                throw new Error.InvalidFieldValue(itemType, key, `[${coord[0]}, ${coord[1]}]`, `coordinate is constrained to be [${PostGIS.LAT_BOTTOM} < lat < ${PostGIS.LAT_TOP} , ${PostGIS.LONG_LEFT} < long < ${PostGIS.LONG_RIGHT}]`);
            }
        }
    }

    static getNextHandshakeState(currentState: Ex.HandshakeState) {
        switch (currentState) {
            case Ex.HandshakeState.INITIATED: return Ex.HandshakeState.SENT;
            case Ex.HandshakeState.SENT: return Ex.HandshakeState.SEEN;
            case Ex.HandshakeState.SEEN: return Ex.HandshakeState.ACCEPTED;
            case Ex.HandshakeState.ACCEPTED: return Ex.HandshakeState.STARTED_REQUESTED_TRIP;
            case Ex.HandshakeState.STARTED_REQUESTED_TRIP: return Ex.HandshakeState.CONFIRMED_REQUESTED_TRIP_START;
            case Ex.HandshakeState.CONFIRMED_REQUESTED_TRIP_START: return Ex.HandshakeState.ENDED_REQUESTED_TRIP;
            case Ex.HandshakeState.ENDED_REQUESTED_TRIP: return Ex.HandshakeState.CONFIRMED_REQUESTED_TRIP_END;
            case Ex.HandshakeState.CONFIRMED_REQUESTED_TRIP_END: return Ex.HandshakeState.DONE_PAYMENT;
            default: {
                throw new Error.InvalidFieldValue("handshake", "state", currentState, `${currentState} has no successive states`);
            };
        }
    }
}

export class Authorizer {
    static me(ctx: Context) {
        if (ctx.user) {
            return ctx.user;
        } else {
            throw new Error.NotSignedIn();
        }
    }

    static async query(ctx: Context, module: PossibleModule, operation: PossibleOperation) {
        const me = this.me(ctx);

        const role = await Server.db.collection<In.Role>("roles").findOne({
            _id: me.roleId
        });

        if (!role) {
            throw new Error.ItemDoesNotExist("role", "id", me.roleId.toHexString());
        }
        
        for (const permission of role.permissions) {
            if (permission.moduleId.toHexString() === ModuleId[module] && permission.value[OperationIndex[operation]] === "1") {
                return me;
            }
        }
        throw new Error.NoPermissions(role, module, operation);
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

    private static makePointString(coord: [number, number]) {
        return `POINT(${coord[1]} ${coord[0]})`;
    }

    private static makeLineString(polyLines: string[]) {
        let lineString = "LINESTRING(";

        const stringifiedCoords: string[] = [];
        for (const polyLine of polyLines) {
            const coords = pl.decode(polyLine);

            if (coords.length > 1) {
                for (const coord of coords) {
                    stringifiedCoords.push(`${coord[1]} ${coord[0]}`);
                }
            }
        }

        lineString += stringifiedCoords.join(",");
        lineString += ")";

        return lineString;
    }

    private static wkb2Coords(wkbEncoding: string) {
        const geometry = wkx.Geometry.parse(Buffer.from(wkbEncoding, "hex"));

        const coords: number[][] = [];
        //@ts-ignore
        if (geometry.lineStrings) {
            //@ts-ignore
            for (const lineString of geometry.lineStrings) {
                for (const point of lineString.points) {
                    coords.push([point.y, point.x]);
                }
            }
        }

        return coords;
    }

    private static wkb2Polyline(wkbEncoding: string) {
        return pl.encode(this.wkb2Coords(wkbEncoding));
    }

    static async calculateRouteMatchResult(mainRoutePolyLines: string[], secondaryRoutePolyLines: string[]) {
        const query = `
            SELECT
                *,
                ((intersection_route_length / main_route_length) * 100) AS secondary_route_coverage,
                ((intersection_route_length / secondary_route_length) * 100) AS main_route_coverage
            FROM (
                SELECT
                    *,
                    ST_Length(intersection_route) AS intersection_route_length
                FROM (
                    SELECT
                        *,
                        ST_Length(main_route) AS main_route_length,
                        ST_Length(secondary_route) AS secondary_route_length,
                        ST_Intersection(main_route, secondary_route) AS intersection_route
                    FROM (
                        SELECT
                            ST_GeomFromText('${this.makeLineString(mainRoutePolyLines)}') AS main_route,
                            ST_GeomFromText('${this.makeLineString(secondaryRoutePolyLines)}') AS secondary_route
                    )
                )
            );
        `;

        const result = (await Server.postgresDriver.query(query)).rows[0];

        return {
            mainRouteLength: result.main_route_length as number,
            secondaryRouteLength: result.secondary_route_length as number,
            intersectionLength: result.intersection_route_length as number,
            mainRouteCoverage: result.main_route_coverage as number,
            secondaryRouteCoverage: result.secondary_route_coverage as number,
            intersectionPolyLine: this.wkb2Polyline(result.intersection_route)
        }
    }

    static async calculateTileOverlapIndex(polyLines: string[]) {
        const query = `
            SELECT STRING_AGG(
                CASE
                    WHEN ST_Intersects(t.geom, ST_GeomFromText('${this.makeLineString(polyLines)}', 4326)) THEN '1' ELSE '0'
                END,
                ''
                ORDER BY t.id
            ) AS tile_overlap_index
            FROM tiles AS t;
        `;
    
        const res = await Server.postgresDriver.query(query);
        return BigInt("0b" + res.rows[0].tile_overlap_index);
    }

    static async isPointWithin(coord: [number, number], proximityRadius: number, polyLines: string[]) {
        const query = `
            SELECT
                ST_DWithin(
                ST_GeogFromText('${this.makePointString(coord)}'),
                ST_GeogFromText('${this.makeLineString(polyLines)}'),
                ${proximityRadius}
            ) AS intersects;
        `;

        const result = await Server.postgresDriver.query(query)
        return result.rows[0].intersects as boolean;
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