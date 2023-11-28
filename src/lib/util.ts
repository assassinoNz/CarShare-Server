import * as pl from "@googlemaps/polyline-codec";
import * as wkx from "wkx";

import * as In from "../graphql/internal";
import * as Error from "./error";
import { Server } from "./app";
import { ModuleId, OperationIndex } from "./enum";
import { Context } from "./interface";

export class PermissionManager {
    static me(ctx: Context) {
        if (ctx.user) {
            return ctx.user;
        } else {
            throw new Error.NotSignedIn();
        }
    }

    static async query(user: In.User | null, moduleId: ModuleId, operationIndex: OperationIndex) {
        if (user) {
            const role = await Server.db.collection<In.Role>("roles").findOne({
                _id: user.roleId
            });
    
            if (role) {
                for (const permission of role.permissions) {
                    if (permission.moduleId.toHexString() === moduleId && permission.value[operationIndex] === "1") {
                        return true;
                    }
                }
                throw new Error.NoPermissions(role, moduleId, operationIndex);
            } else {
                throw new Error.ItemDoesNotExist("role", "id", user.roleId.toHexString());
            }
        } else {
            throw new Error.NotSignedIn();
        }
    }
}

export class PostGIS {
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
        const geometry = wkx.Geometry.parse(Buffer.from(wkbEncoding, 'hex'));
    
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
}