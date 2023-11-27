import { GraphQLError } from "graphql";

import * as In from "../graphql/internal";
import { ModuleId, ModuleName, OperationIndex } from "./enum";

export class PasswordMismatch extends GraphQLError {
    constructor(username: string) {
        super(`Incorrect password for user ${username}`, {
            extensions: {
                title: `Oops! password mismatch`,
                suggestion: `Type your password again`,
                description: `The password provided is incorrect`,
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
                description: `Current user doesn't have sufficient permissions for the requested operation`,
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
                description: `Some operations in the system require the user to be validated. Therefore, signing in with a valid user account is compulsory.`,
                code: `NOT_SIGNED_IN`
            }
        });
    }
}

export class AttemptedSelfDestruction extends GraphQLError {
    constructor() {
        super(`Attempted to delete yourself`, {
            extensions: {
                title: `Hey! Cannot delete yourself`,
                suggestion: `Sign in as another user`,
                description: `The user that got attempted to delete is the same user that attempted the operation. You cannot delete the user you are signed in as.`,
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
                description: `Couldn't perform the operation. This is most probably due to an undisclosed error. Please try again`,
                code: `COULD_NOT_PERFORM_OPERATION`
            }
        });
    }
}

export class ItemNotAccessibleByUser extends GraphQLError {
    constructor(itemCategory: string, uniqueKey: string, uniqueKeyValue: string) {
        super(`Denied access to ${itemCategory} with ${uniqueKey} set to ${uniqueKeyValue}`, {
            extensions: {
                title: `Whoa! You aren't allowed to access that ${itemCategory}`,
                suggestion: `Try retrieving valid arguments before invoking procedure calls`,
                description: `You've tried to access ${itemCategory} with ${uniqueKey} set to ${uniqueKeyValue} and got denied by the system. This algorithm need to access a ${itemCategory} that needs to be accessible by a specific user`,
                code: `ITEM_NOT_ACCESSIBLE_BY_USER`
            }
        });
    }
}

export class ItemAlreadyExists extends GraphQLError {
    constructor(itemCategory: string, uniqueKey: string, uniqueKeyValue: string) {
        super(`That ${itemCategory} already exists with ${uniqueKey} set to ${uniqueKeyValue}`, {
            extensions: {
                title: `Oops! ${itemCategory} already exists`,
                suggestion: `Change the value provided for ${uniqueKey}`,
                description: `A ${itemCategory} with the same ${uniqueKey} set to ${uniqueKeyValue} already exists in the database. Please provide a new ${uniqueKey}`,
                code: `ITEM_ALREADY_EXISTS`
            }
        });
    }
}

export class ItemDoesNotExist extends GraphQLError {
    constructor(itemCategory: string, uniqueKey: string, uniqueKeyValue: string) {
        super(`Couldn't find that ${itemCategory} with ${uniqueKey} set to ${uniqueKeyValue}`, {
            extensions: {
                title: `No such ${itemCategory} exists`,
                suggestion: `Check the value provided for ${uniqueKey} field`,
                description: `Couldn't find a ${itemCategory} with ${uniqueKey} set to ${uniqueKeyValue}. Please provide an existing ${uniqueKey}`,
                code: `ITEM_DOES_NOT_EXIST`
            }
        });
    }
}

export class ItemIsNotActive extends GraphQLError {
    constructor(itemCategory: string, uniqueKey: string, uniqueKeyValue: string) {
        super(`That ${itemCategory} with ${uniqueKey} set to ${uniqueKeyValue} is not active or expired`, {
            extensions: {
                title: `That ${itemCategory} is inactive or expired`,
                suggestion: `Try providing details regarding an active ${itemCategory}`,
                description: `That ${itemCategory} with ${uniqueKey} set to ${uniqueKeyValue} is not active or expired. The ${itemCategory} may have ended its lifetime or may have been disabled by a user`,
                code: `ITEM_IS_NOT_ACTIVE`
            }
        });
    }
}