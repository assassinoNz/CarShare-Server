import { GraphQLError } from "graphql";

import * as In from "../graphql/internal";
import { Module, Operation, PossibleModule, PossibleOperation } from "./enum";

export class PasswordMismatch extends GraphQLError {
    constructor(username: string) {
        super(`Incorrect password for user identified by ${username}`, {
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
    constructor(role: In.Role, module: PossibleModule, operation: PossibleOperation) {
        super(`Permissions denied to perform ${Operation[operation]} on module ${Module[module]} for role ${role.name}`, {
            extensions: {
                title: `Whoa! Go no further`,
                suggestion: `Check your permissions`,
                description: `Current user doesn't have sufficient permissions to perform the requested operation on the given module`,
                code: `NO_PERMISSIONS`
            }
        });
    }
}

export class NotSignedIn extends GraphQLError {
    constructor() {
        super(`No signed user found in current session`, {
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
                description: `The user that is to be deleted is the same user that attempted the operation. You cannot delete the user you are signed in as.`,
                code: `ATTEMPTED_SELF_DESTRUCTION`
            }
        });
    }
}

export class CouldNotPerformOperation extends GraphQLError {
    constructor(module: PossibleModule, operation: PossibleOperation) {
        super(`Could not perform ${Operation[operation]} on module ${Module[module]}`, {
            extensions: {
                title: `Oops! something went wrong`,
                suggestion: `Try again`,
                description: `Couldn't perform that operation on the given module. This is most probably due to an undisclosed error. Please try again`,
                code: `COULD_NOT_PERFORM_OPERATION`
            }
        });
    }
}

export class ItemNotAccessibleByUser extends GraphQLError {
    constructor(itemType: string, uniqueKey: string, uniqueKeyValue: string) {
        super(`Denied access to ${itemType} with ${uniqueKey} set to ${uniqueKeyValue}`, {
            extensions: {
                title: `Whoa! You aren't allowed to access that ${itemType}`,
                suggestion: `Try retrieving valid arguments before invoking procedure calls`,
                description: `The required ${itemType} for this procedure is not accessible by the current user or a user passed in as an argument`,
                code: `ITEM_NOT_ACCESSIBLE_BY_USER`
            }
        });
    }
}

export class ItemAlreadyExists extends GraphQLError {
    constructor(itemType: string, uniqueKey: string, uniqueKeyValue: string) {
        super(`A ${itemType} with ${uniqueKey} set to ${uniqueKeyValue} already exists`, {
            extensions: {
                title: `Oops! ${itemType} already exists`,
                suggestion: `Change the value provided for ${uniqueKey}`,
                description: `A ${itemType} with the same ${uniqueKey} already exists in the database. Please provide a new ${uniqueKey}`,
                code: `ITEM_ALREADY_EXISTS`
            }
        });
    }
}

export class ItemDoesNotExist extends GraphQLError {
    constructor(itemType: string, uniqueKey: string, uniqueKeyValue: string) {
        super(`Couldn't find that ${itemType} with ${uniqueKey} set to ${uniqueKeyValue}`, {
            extensions: {
                title: `No such ${itemType} exists`,
                suggestion: `Check the value provided for ${uniqueKey} field`,
                description: `The required ${itemType} for this procedure cannot be found within the database. Please provide an existing ${uniqueKey}`,
                code: `ITEM_DOES_NOT_EXIST`
            }
        });
    }
}

export class InvalidItemState extends GraphQLError {
    constructor(itemType: string, key: string, keyValue: string, currentState: string, neededState: string, toState: string) {
        super(`Current state ${currentState} of the ${itemType} with ${key} set to ${keyValue} is not valid to be transitioned to ${toState}`, {
            extensions: {
                title: `The subjected to modification is in invalid state`,
                suggestion: `Try to bring it to a valid state before performing the operation`,
                description: `The ${itemType} with ${key} set to ${keyValue} needs to be in ${neededState} state to be transitioned to ${toState}.`,
                code: `INVALID_FIELD_VALUE`
            }
        });
    }
}

export class ItemIsNotActive extends GraphQLError {
    constructor(itemType: string, uniqueKey: string, uniqueKeyValue: string) {
        super(`That ${itemType} with ${uniqueKey} set to ${uniqueKeyValue} is not active or is expired`, {
            extensions: {
                title: `That ${itemType} is inactive or expired`,
                suggestion: `Try providing a ${uniqueKey} regarding an active ${itemType}`,
                description: `The required ${itemType} for this procedure is not active or expired. The ${itemType} may have ended its lifetime or may have been disabled by a user.`,
                code: `ITEM_IS_NOT_ACTIVE`
            }
        });
    }
}

export class InvalidFieldValue extends GraphQLError {
    constructor(itemType: string, key: string, keyValue: string, because: string) {
        super(`The value ${keyValue} provided for the ${key} field is not valid`, {
            extensions: {
                title: `One of the values provided is invalid`,
                suggestion: `Try providing a valid value`,
                description: `The ${key} field of ${itemType} is invalid because ${because}.`,
                code: `INVALID_FIELD_VALUE`
            }
        });
    }
}