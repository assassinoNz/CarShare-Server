import fetch from "node-fetch";
import { Request, Response } from "express";
import { URL_NOMINATIM, URL_OSRM } from "../../config";

export const OsrmResolver = {
    calculatePossibleRoutes: async (req: Request, res: Response): Promise<void> => {
        try {
            const data = await fetch(`${URL_OSRM}/${encodeURIComponent(req.params.keyCoords)}?overview=false&steps=true`)
                .then((response: any) => response.json());

            res.json(data);
        } catch (err: any) {
            console.error(err);
            res.sendStatus(500);
        }
    }
}

export const NominatimResolver = {
    searchForCoords: async (req: Request, res: Response): Promise<void> => {
        try {
            const data = await fetch(`${URL_NOMINATIM}?format=json&q=${encodeURIComponent(req.query.q as string)}`)
                .then((response: any) => response.json());

            res.json(data);
        } catch (err: any) {
            console.error(err);
            res.sendStatus(500);
        }
    }
}