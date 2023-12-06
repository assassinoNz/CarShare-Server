import * as GraphQLType from "./graphql";
import { GraphQlInput, Requester } from "./util";

export class GraphQLProcedure {
    static async AddBankAccounts(url: string, jwt: string, count = 10) {
        for (let i = 0; i < count; i++) {
            try {
                const result = await Requester.fetch<{ bankAccount: GraphQLType.BankAccountInput }, GraphQLType.Mutation["AddBankAccount"]>(
                    url,
                    jwt,
                    `mutation Mutation($bankAccount: BankAccountInput!) {
                        result: AddBankAccount(bankAccount: $bankAccount)
                    }`,
                    {
                        bankAccount: GraphQlInput.bankAccount()
                    }
                );
    
                console.log(result);
            } catch (err) {
                console.error(err);
            }
        }
    }

    static async AddVehicles(url: string, jwt: string, count = 10) {
        for (let i = 0; i < count; i++) {
            try {
                const result = await Requester.fetch<{ vehicle: GraphQLType.VehicleInput }, GraphQLType.Mutation["AddVehicle"]>(
                    url,
                    jwt,
                    `mutation Mutation($vehicle: VehicleInput!) {
                        result: AddVehicle(vehicle: $vehicle)
                    }`,
                    {
                        vehicle: GraphQlInput.vehicle()
                    }
                );
    
                console.log(result);
            } catch (err) {
                console.error(err);
            }
        }
    }
    
    static async AddRequestedTrips(url: string, jwt: string, count = 10) {
        for (let i = 0; i < count; i++) {
            try {
                const result = await Requester.fetch<{ requestedTrip: GraphQLType.RequestedTripInput }, GraphQLType.Mutation["AddRequestedTrip"]>(
                    url,
                    jwt,
                    `mutation AddRequestedTrip($requestedTrip: RequestedTripInput!) {
                        result: AddRequestedTrip(requestedTrip: $requestedTrip)
                    }`,
                    {
                        requestedTrip: await GraphQlInput.requestedTrip()
                    }
                );
    
                console.log(result);
            } catch (err) {
                console.error(err);
            }
        }
    }
    
    static async AddHostedTrips(url: string, jwt: string, count = 10) {
        const bankAccounts = await Requester.fetch<null, GraphQLType.Query["GetMyBankAccounts"]>(
            url,
            jwt,
            `query GetMyBankAccounts {
                result: GetMyBankAccounts {
                _id
                }
            }`,
            null
        );
    
        const vehicles = await Requester.fetch<null, GraphQLType.Query["GetMyVehicles"]>(
            url,
            jwt,
            `query GetMyVehicles {
                result: GetMyVehicles {
                _id
                }
            }`,
            null
        );
    
        for (let i = 0; i < count; i++) {
            try {
                const result = await Requester.fetch<{ hostedTrip: GraphQLType.HostedTripInput }, GraphQLType.Mutation["AddHostedTrip"]>(
                    url,
                    jwt,
                    `mutation Mutation($hostedTrip: HostedTripInput!) {
                        result: AddHostedTrip(hostedTrip: $hostedTrip)
                    }`,
                    {
                        hostedTrip: await GraphQlInput.hostedTrip(bankAccounts, vehicles)
                    }
                );
    
                console.log(result);
            } catch (err) {
                console.error(err);
            }
        }
    }
}