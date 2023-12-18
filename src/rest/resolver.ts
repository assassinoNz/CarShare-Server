import fetch from "node-fetch";
import { Request, Response } from "express";
import * as Config from "../../config.js";
import { JwtPayload } from "../lib/interface.js";
import { Server } from "../lib/app.js";

export const osrm = {
    CalculatePossibleRoutes: async (req: Request, res: Response): Promise<void> => {
        //Get JWT token from the header or make it empty
        const token = req.headers.authorization || "";

        try {
            await Server.jwtr.verify(token, Config.SECRET_JWT) as JwtPayload;

            try {
                const data = await fetch(`${Config.URL_OSRM}/${encodeURIComponent(req.params.keyCoords)}?overview=false&steps=true`)
                    .then((response: any) => response.json());

                res.json(data);
            } catch (err: any) {
                console.error(err);
                res.sendStatus(500);
            }

        } catch (err) {
            console.error(err);
            res.sendStatus(500);
        }
    }
};

export const nominatim = {
    SearchForCoords: async (req: Request, res: Response): Promise<void> => {
        //Get JWT token from the header or make it empty
        const token = req.headers.authorization || "";

        try {
            await Server.jwtr.verify(token, Config.SECRET_JWT) as JwtPayload;

            try {
                const data = await fetch(`${Config.URL_NOMINATIM}/search?format=json&q=${encodeURIComponent(req.query.q as string)}`)
                    .then((response: any) => response.json());

                res.json(data);
            } catch (err: any) {
                console.error(err);
                res.sendStatus(500);
            }
        } catch (err) {
            console.error(err);
            res.sendStatus(500);
        }
    }
};