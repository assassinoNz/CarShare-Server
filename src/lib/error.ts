import { GraphQLError } from "graphql";

import * as In from "../graphql/internal";
import { ModuleId, ModuleName, OperationIndex } from "./enum";

export class PasswordMismatch extends GraphQLError {
    constructor(username: string) {
        super(`Incorrect password for user ${username}`, {
            extensions: {
                title: `Oops! password mismatch`,
                suggestion: `Type your password again`,
                description: `The password you typed is incorrect`,
                code: `PASSWORD_MISMATCH`
            }
        });
    }
}

export class NoPermissions extends GraphQLError {
    constructor(role: In.Role, moduleId: ModuleId, operationIndex: OperationIndex) {
        super(`Permissions denied to perform operation ${OperationIndex[operationIndex]} on module ${ModuleName[moduleId]} for role ${role.name}`, {
            extensions: {
                title: `Whoa! Go no further`,
                suggestion: `Check your permissions`,
                description: `Looks like you don't have sufficient permissions for the requested operation`,
                code: `NO_PERMISSIONS`
            }
        });
    }
}

export class NotSignedIn extends GraphQLError {
    constructor() {
        super(`No user in session`, {
            extensions: {
                title: `You're not signed in`,
                suggestion: `Just sign in to the system`,
                description: `Some operations in the system require the user to be validated. Therefore, signing in with a valid user account is compulsory`,
                code: `NOT_SIGNED_IN`
            }
        });
    }
}

export class AttemptedSelfDestruction extends GraphQLError {
    constructor() {
        super(`Cannot delete yourself`, {
            extensions: {
                title: `Attempted to delete yourself`,
                suggestion: `Sign in as another user`,
                description: `You are signed in as the user you attempted to delete. You cannot delete the user you are signed in as.`,
                code: `ATTEMPTED_SELF_DESTRUCTION`
            }
        });
    }
}

export class CouldNotPerformOperation extends GraphQLError {
    constructor(moduleId: ModuleId, operationIndex: OperationIndex) {
        super(`Could not perform operation ${OperationIndex[operationIndex]} on module ${ModuleName[moduleId]}`, {
            extensions: {
                title: `Oops! something went wrong`,
                suggestion: `Try again`,
                description: `Couldn't perform the operation. Please try again`,
                code: `COULD_NOT_PERFORM_OPERATION`
            }
        });
    }
}

export class ItemAlreadyExists extends GraphQLError {
    constructor(itemCategory: string, uniqueKey: string, uniqueKeyValue: string) {
        super(`That ${itemCategory} already exists`, {
            extensions: {
                title: `That ${itemCategory} already exists with ${uniqueKey} set to ${uniqueKeyValue}`,
                suggestion: `Change the value provided for ${uniqueKey}`,
                description: `A ${itemCategory} with the same ${uniqueKey} set to ${uniqueKeyValue} already exists in the database. Please provide a new ${uniqueKey}`,
                code: `ITEM_ALREADY_EXISTS`
            }
        });
    }
}

export class ItemDoesNotExist extends GraphQLError {
    constructor(itemCategory: string, uniqueKey: string, uniqueKeyValue: string) {
        super(`No such ${itemCategory} exists`, {
            extensions: {
                title: `Couldn't find that ${itemCategory} with ${uniqueKey} set to ${uniqueKeyValue}`,
                suggestion: `Check the value provided for ${uniqueKey} field`,
                description: `Couldn't find a ${itemCategory} with ${uniqueKey} set to ${uniqueKeyValue}. Please provide an existing ${uniqueKey}`,
                code: `ITEM_DOES_NOT_EXIST`
            }
        });
    }
}