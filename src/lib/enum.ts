import { StringUtil } from "./util";

export enum OperationIndex { CREATE, RETRIEVE, UPDATE, DELETE }

export enum ModuleId {
    ROLES = "000000000000000000000000",
    USERS = "000000000000000000000001",
    VEHICLES = "000000000000000000000002",
    HOSTED_TRIPS = "000000000000000000000003",
    REQUESTED_TRIPS = "000000000000000000000004",
    HANDSHAKES = "000000000000000000000005",
    BANK_ACCOUNTS = "000000000000000000000006",
}

/**
 * A dictionary that maps each module id to its screaming snake case name
 */
export const ModuleName: { [_ in ModuleId]: string } = (Object.keys(ModuleId) as (keyof typeof ModuleId)[])
    .reduce((acc, key) => {
        acc[ModuleId[key]] = key;
        return acc;
    }, {} as { [_ in ModuleId]: string });

/**
 * A dictionary that maps each module id to its collection-like name
 */
export const Collection: { -readonly [_ in keyof typeof ModuleId]: string } = (Object.keys(ModuleId) as (keyof typeof ModuleId)[])
    .reduce((acc, key) => {
        acc[key] = StringUtil.toCamelCase(key);
        return acc;
    }, {} as { -readonly [_ in keyof typeof ModuleId]: string });