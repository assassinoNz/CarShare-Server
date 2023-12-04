import * as pl from "@googlemaps/polyline-codec";
import * as wkx from "wkx";

import * as Error from "./error";
import * as Config from "../../config";
import * as In from "../graphql/internal";
import { Server } from "./app";
import { ModuleId, OperationIndex } from "./enum";
import { Context, OsrmRoute } from "./interface";

export class StringUtil {
    static toCamelCase(screamingSnakeCase: string) {
        return screamingSnakeCase.toLowerCase()
            .split("_")
            .map((word, index) => index !== 0 ? word[0].toUpperCase() + word.slice(1) : word)
            .join("");
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

    static async query(ctx: Context, moduleId: ModuleId, operationIndex: OperationIndex) {
        const me = this.me(ctx);

        const role = await Server.db.collection<In.Role>("roles").findOne({
            _id: me.roleId
        });

        if (!role) {
            throw new Error.ItemDoesNotExist("role", "id", me.roleId.toHexString());
        }
        
        for (const permission of role.permissions) {
            if (permission.moduleId.toHexString() === moduleId && permission.value[operationIndex] === "1") {
                return me;
            }
        }
        throw new Error.NoPermissions(role, moduleId, operationIndex);
    }
}

export class PostGIS {
    //Boundary of Sri Lanka as returned by Nominatim
    //Longitudes, X coords
    private static readonly leftX = 79.4219890;
    private static readonly rightX = 82.0810141;
    //Latitudes, Y coords
    private static readonly topY = 10.0350000;
    private static readonly bottomY = 5.7190000;

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

    /**
     * @param coords An array of arrays with each array representing a coordinate as [lat, long]
    */
    private static makePolyString(coords: number[][]) {
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
            mainRouteLength: result.main_route_length,
            secondaryRouteLength: result.secondary_route_length,
            intersectionLength: result.intersection_route_length,
            mainRouteCoverage: result.main_route_coverage,
            secondaryRouteCoverage: result.secondary_route_coverage,
            intersectionPolyLine: this.wkb2Polyline(result.intersection_route)
        }
    }

    static async rebuildTilesTable(numTilesX: number, numTilesY: number) {
        //Calculate needed distance between two longitudes
        const tileWidth = (this.rightX - this.leftX) / numTilesX;
        const longitudes: number[] = [this.leftX];
        for (let c = 1; c <= numTilesX; c++) {
            //NOTE: Longitude value is increasing from left to right
            longitudes[c] = longitudes[c - 1] + tileWidth;
        }

        //Calculate needed distance between two latitudes
        const tileHeight = (this.topY - this.bottomY) / numTilesY;
        const latitudes: number[] = [this.topY];
        for (let r = 1; r <= numTilesY; r++) {
            //NOTE: Latitude value is decreasing from top to bottom
            latitudes[r] = latitudes[r - 1] - tileHeight;
        }

        let values = [];
        for (let c = 0; c < longitudes.length - 1; c++) {
            for (let r = 0; r < latitudes.length - 1; r++) {
                values.push(`(ST_GeomFromText('${this.makePolyString([
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


        const query1 = "DROP TABLE tiles;";
        await Server.postgresDriver.query(query1);

        const query2 = `
            CREATE TABLE tiles (
                id SERIAL PRIMARY KEY,
                geom GEOMETRY(Polygon, 4326)
            );
        `;
        await Server.postgresDriver.query(query2);

        const query3 = `INSERT INTO tiles (geom) VALUES ` + values.join(",") + ";";
        await Server.postgresDriver.query(query3);
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
}
export class Osrm {
    static calculatePossibleRoutes(coords: number[][]) {
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