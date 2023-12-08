import { Strings } from "./util";

export enum OperationIndex { CREATE, RETRIEVE, UPDATE, DELETE }

/**
 * Union of possible operations within the system extracted from OperationIndex 
*/
export type PossibleOperation = keyof typeof OperationIndex;

/**
 * An enum-like object that maps each of Operations to itself
*/
export const Operation = (Object.keys(OperationIndex) as PossibleOperation[]).reduce((acc, key) => {
    //@ts-ignore
    acc[key] = key;
    return acc;
}, {} as {[K in PossibleOperation]: K});

export enum ModuleId {
    ROLES = "000000000000000000000000",
    USERS = "000000000000000000000001",
    VEHICLES = "000000000000000000000002",
    HOSTED_TRIPS = "000000000000000000000003",
    REQUESTED_TRIPS = "000000000000000000000004",
    HANDSHAKES = "000000000000000000000005",
    BANK_ACCOUNTS = "000000000000000000000006",
};

/**
 * Union of possible modules within the system extracted from ModuleId 
*/
export type PossibleModule = keyof typeof ModuleId;

/**
 * An enum-like object that maps each of Modules to itself
*/
export const Module = (Object.keys(ModuleId) as PossibleModule[]).reduce((acc, key) => {
    //@ts-ignore
    acc[key] = key;
    return acc;
}, {} as {[K in PossibleModule]: K});

/**
 * An enum-like object that maps each module id to its collection-like name
 */
export const Collection = (Object.keys(ModuleId) as PossibleModule[]).reduce((acc, key: PossibleModule) => {
    //@ts-ignore
    acc[key] = Strings.screamingSnake2Camel(key);
    return acc;
}, {} as {[K in PossibleModule]: K});