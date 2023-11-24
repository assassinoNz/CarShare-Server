import { ModuleId, ModuleName, OperationIndex, OperationName } from "./enum";
import * as Internal from "../graphql/internal";
import { CustomErrorDetails } from "./interface";

class CustomError extends Error {
    title: string;
    suggestion: string;
    code: string;

    constructor(details: CustomErrorDetails) {
        super(details.message, {
            cause: details.description
        });

        this.title = details.title;
        this.suggestion = details.suggestion;
        this.code = details.code;
    }
}

export class PasswordMismatch extends CustomError {
    constructor(username: string) {
        super({
            message: `Incorrect password for user ${username}`,
            title: `Oops! password mismatch`,
            suggestion: `Type your password again`,
            description: `The password you typed is incorrect`,
            code: `PASSWORD_MISMATCH`
        });
    }
}

export class NoPermissions extends CustomError {
    constructor(role: Internal.Role, moduleId: ModuleId, operationIndex: OperationIndex) {
        super({
            message: `Permissions denied to perform operation ${operationIndex} on module ${moduleId} for role ${role.name}`,
            title: `Whoa! Go no further`,
            suggestion: `Check your permissions`,
            description: `Looks like you don't have sufficient permissions for the requested operation`,
            code: `NO_PERMISSIONS`
        });
    }
}

export class NotSignedIn extends CustomError {
    constructor() {
        super({
            message: `No user in session`,
            title: `You're not signed in`,
            suggestion: `Just sign in to the system`,
            description: `Some operations in the system require the user to be validated. Therefore, signing in with a valid user account is compulsory`,
            code: `NOT_SIGNED_IN`
        });
    }
}

export class AttemptedSelfDestruction extends CustomError {
    constructor() {
        super({
            message: `Cannot delete yourself`,
            title: `Attempted to delete yourself`,
            suggestion: `Sign in as another user`,
            description: `You are signed in as the user you attempted to delete. You cannot delete the user you are signed in as.`,
            code: `ATTEMPTED_SELF_DESTRUCTION`
        });
    }
}

export class CouldNotPerformOperation extends CustomError {
    constructor(moduleName: ModuleName, operationName: OperationName) {
        super({
            message: `Could not perform operation ${operationName} on module ${moduleName}`,
            title: `Oops! something went wrong`,
            suggestion: `Try again`,
            description: `Couldn't perform the operation. Please try again`,
            code: `COULD_NOT_PERFORM_OPERATION`
        });
    }
}

export class ItemAlreadyExists extends CustomError {
    constructor(itemCategory: string, uniqueKey: string, uniqueKeyValue: string) {
        super({
            message: `That ${itemCategory} already exists`,
            title: `That ${itemCategory} already exists with ${uniqueKey} set to ${uniqueKeyValue}`,
            suggestion: `Change the value provided for ${uniqueKey}`,
            description: `A ${itemCategory} with the same ${uniqueKey} set to ${uniqueKeyValue} already exists in the database. Please provide a new ${uniqueKey}`,
            code: `ITEM_ALREADY_EXISTS`
        });
    }
}

export class ItemDoesNotExist extends CustomError {
    constructor(itemCategory: string, uniqueKey: string, uniqueKeyValue: string) {
        super({
            message: `No such ${itemCategory} exists`,
            title: `Couldn't find that ${itemCategory} with ${uniqueKey} set to ${uniqueKeyValue}`,
            suggestion: `Check the value provided for ${uniqueKey} field`,
            description: `Couldn't find a ${itemCategory} with ${uniqueKey} set to ${uniqueKeyValue}. Please provide an existing ${uniqueKey}`,
            code: `ITEM_DOES_NOT_EXIST`
        });
    }
}