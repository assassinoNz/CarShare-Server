import * as Error from "./error";
import * as Internal from "../graphql/internal";

import { Server } from "./app";
import { ModuleId, OperationIndex } from "./enum";
import { Context } from "./interface";

export class PermissionManager {
    static getMe(ctx: Context) {
        if (ctx.user) {
            return ctx.user;
        } else {
            throw new Error.NotSignedIn();
        }
    }

    static async queryPermission(user: Internal.User | null, moduleId: ModuleId, operationIndex: OperationIndex) {
        if (user) {
            const role = await Server.db.collection<Internal.Role>("roles").findOne({
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