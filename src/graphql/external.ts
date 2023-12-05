import { ObjectId } from "mongodb";
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  Date: { input: Date; output: Date; }
  ObjectId: { input: ObjectId; output: ObjectId; }
};

export type BankAccount = {
  __typename?: 'BankAccount';
  _id: Scalars['ObjectId']['output'];
  bank: Scalars['String']['output'];
  branch: Scalars['String']['output'];
  isActive: Scalars['Boolean']['output'];
  name: Scalars['String']['output'];
  number: Scalars['String']['output'];
};

export type BankAccountInput = {
  /** @constraint(pattern: ^[a-zA-Z0-9\s]{3,20}$) */
  bank: Scalars['String']['input'];
  /** @constraint(pattern: ^[a-zA-Z0-9\s]{3,20}$) */
  branch: Scalars['String']['input'];
  /** @constraint(pattern: ^[a-zA-Z0-9\s]{3,20}$) */
  name: Scalars['String']['input'];
  /** @constraint(pattern: ^[a-zA-Z0-9\s]{3,20}$) */
  number: Scalars['String']['input'];
};

export type Handshake = {
  __typename?: 'Handshake';
  _id: Scalars['ObjectId']['output'];
  hostedTrip: HostedTrip;
  payment: Payment;
  rating: TripRating;
  recipient: User;
  requestedTrip: RequestedTrip;
  sender: User;
  time: HandshakeTime;
};

export type HandshakeTime = {
  __typename?: 'HandshakeTime';
  accepted?: Maybe<Scalars['Date']['output']>;
  sent: Scalars['Date']['output'];
};

export type HostRating = {
  __typename?: 'HostRating';
  driving: Scalars['Float']['output'];
  meetsCondition: Scalars['Float']['output'];
  politeness: Scalars['Float']['output'];
  punctuality: Scalars['Float']['output'];
};

export type HostedTrip = {
  __typename?: 'HostedTrip';
  _id: Scalars['ObjectId']['output'];
  billing: TripBilling;
  hasHandshakes: Scalars['Boolean']['output'];
  host: User;
  route: HostedTripRoute;
  seats: Scalars['Int']['output'];
  time: TripTime;
  vehicle: Vehicle;
};

export type HostedTripInput = {
  billing: TripBillingInput;
  route: HostedTripRouteInput;
  /** @constraint(min: 1) */
  seats: Scalars['Int']['input'];
  time: TripTimeInput;
  vehicle?: InputMaybe<VehicleInput>;
  vehicleId?: InputMaybe<Scalars['ObjectId']['input']>;
};

export type HostedTripRoute = {
  __typename?: 'HostedTripRoute';
  from: Scalars['String']['output'];
  keyCoords: Array<Array<Scalars['Float']['output']>>;
  polyLines: Array<Scalars['String']['output']>;
  to: Scalars['String']['output'];
};

export type HostedTripRouteInput = {
  from: Scalars['String']['input'];
  /** An array of [lat, long] arrays. @constraint(minItems: 2) */
  keyCoords: Array<Array<Scalars['Float']['input']>>;
  /** @constraint(minItems: 2) */
  polyLines: Array<Scalars['String']['input']>;
  to: Scalars['String']['input'];
};

export type Mutation = {
  __typename?: 'Mutation';
  AddBankAccount: Scalars['ObjectId']['output'];
  AddHostedTrip: Scalars['ObjectId']['output'];
  AddRequestedTrip: Scalars['ObjectId']['output'];
  AddVehicle: Scalars['ObjectId']['output'];
  CreateGenericUser: Scalars['String']['output'];
  SignIn: Scalars['String']['output'];
};


export type MutationAddBankAccountArgs = {
  bankAccount: BankAccountInput;
};


export type MutationAddHostedTripArgs = {
  hostedTrip: HostedTripInput;
};


export type MutationAddRequestedTripArgs = {
  requestedTrip: RequestedTripInput;
};


export type MutationAddVehicleArgs = {
  vehicle: VehicleInput;
};


export type MutationCreateGenericUserArgs = {
  user: UserInput;
};


export type MutationSignInArgs = {
  mobile: Scalars['String']['input'];
  password: Scalars['String']['input'];
};

export type Payment = {
  __typename?: 'Payment';
  amount: Scalars['Float']['output'];
  time?: Maybe<Scalars['Date']['output']>;
};

export type Query = {
  __typename?: 'Query';
  GetMatchingRequestedTrips: Array<RequestedTripMatch>;
  GetMe: User;
  GetMyBankAccounts: Array<BankAccount>;
  GetMyHandshake: Handshake;
  GetMyHandshakes: Array<Maybe<Handshake>>;
  GetMyHostedTrip: HostedTrip;
  GetMyHostedTrips: Array<Maybe<HostedTrip>>;
  GetMyRequestedTrip: RequestedTrip;
  GetMyRequestedTrips: Array<Maybe<RequestedTrip>>;
  GetMyVehicles: Array<Vehicle>;
};


export type QueryGetMatchingRequestedTripsArgs = {
  hostedTripId: Scalars['ObjectId']['input'];
};


export type QueryGetMyBankAccountsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  skip?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryGetMyHandshakeArgs = {
  _id: Scalars['ObjectId']['input'];
};


export type QueryGetMyHandshakesArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  sent?: InputMaybe<Scalars['Boolean']['input']>;
  skip?: InputMaybe<Scalars['Int']['input']>;
  tripId?: InputMaybe<Scalars['ObjectId']['input']>;
};


export type QueryGetMyHostedTripArgs = {
  _id: Scalars['ObjectId']['input'];
};


export type QueryGetMyHostedTripsArgs = {
  from?: InputMaybe<Scalars['Date']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  skip?: InputMaybe<Scalars['Int']['input']>;
  to?: InputMaybe<Scalars['Date']['input']>;
};


export type QueryGetMyRequestedTripArgs = {
  _id: Scalars['ObjectId']['input'];
};


export type QueryGetMyRequestedTripsArgs = {
  from?: InputMaybe<Scalars['Date']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  skip?: InputMaybe<Scalars['Int']['input']>;
  to?: InputMaybe<Scalars['Date']['input']>;
};


export type QueryGetMyVehiclesArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  skip?: InputMaybe<Scalars['Int']['input']>;
};

export type RequestedTrip = {
  __typename?: 'RequestedTrip';
  _id: Scalars['ObjectId']['output'];
  hasHandshakes: Scalars['Boolean']['output'];
  requester: User;
  route: RequestedTripRoute;
  seats: Scalars['Int']['output'];
  time: TripTime;
  vehicleFeatures: RequestedVehicleFeatures;
};

export type RequestedTripInput = {
  route: RequestedTripRouteInput;
  /** @constraint(min: 1) */
  seats: Scalars['Int']['input'];
  time: TripTimeInput;
  vehicleFeatures: RequestedVehicleFeaturesInput;
};

export type RequestedTripMatch = {
  __typename?: 'RequestedTripMatch';
  requestedTrip: RequestedTrip;
  results: Array<TripMatchResult>;
};

export type RequestedTripRoute = {
  __typename?: 'RequestedTripRoute';
  from: Scalars['String']['output'];
  keyCoords: Array<Array<Scalars['Float']['output']>>;
  to: Scalars['String']['output'];
};

export type RequestedTripRouteInput = {
  from: Scalars['String']['input'];
  /** An array of [lat, long] arrays. @constraint(minItems: 2) */
  keyCoords: Array<Array<Scalars['Float']['input']>>;
  to: Scalars['String']['input'];
};

export type RequestedVehicleFeatures = {
  __typename?: 'RequestedVehicleFeatures';
  ac?: Maybe<Scalars['Boolean']['output']>;
  luggage?: Maybe<Scalars['Boolean']['output']>;
};

export type RequestedVehicleFeaturesInput = {
  ac?: InputMaybe<Scalars['Boolean']['input']>;
  luggage?: InputMaybe<Scalars['Boolean']['input']>;
};

export type RequesterRating = {
  __typename?: 'RequesterRating';
  politeness: Scalars['Float']['output'];
  punctuality: Scalars['Float']['output'];
};

export type TripBilling = {
  __typename?: 'TripBilling';
  bankAccount: BankAccount;
  priceFirstKm: Scalars['Float']['output'];
  priceNextKm: Scalars['Float']['output'];
};

export type TripBillingInput = {
  bankAccountId: Scalars['ObjectId']['input'];
  /** @constraint(min: 0) */
  priceFirstKm: Scalars['Float']['input'];
  /** @constraint(min: 0) */
  priceNextKm: Scalars['Float']['input'];
};

export type TripMatchResult = {
  __typename?: 'TripMatchResult';
  hostedTripCoverage: Scalars['Float']['output'];
  hostedTripLength: Scalars['Float']['output'];
  intersectionLength: Scalars['Float']['output'];
  intersectionPolyLine: Scalars['String']['output'];
  requestedTripCoverage: Scalars['Float']['output'];
  requestedTripLength: Scalars['Float']['output'];
};

export type TripRating = {
  __typename?: 'TripRating';
  host: HostRating;
  requester: RequesterRating;
  vehicle: VehicleRating;
};

export type TripTime = {
  __typename?: 'TripTime';
  end?: Maybe<Scalars['Date']['output']>;
  schedule: Scalars['Date']['output'];
  start?: Maybe<Scalars['Date']['output']>;
};

export type TripTimeInput = {
  schedule: Scalars['Date']['input'];
};

export type User = {
  __typename?: 'User';
  _id: Scalars['ObjectId']['output'];
  currentCoord?: Maybe<Array<Scalars['Float']['output']>>;
  email: Scalars['String']['output'];
  isActive: Scalars['Boolean']['output'];
  mobile: Scalars['String']['output'];
  preferredName: Scalars['String']['output'];
  rating: UserRating;
};

export type UserInput = {
  email: Scalars['String']['input'];
  /** @constraint(pattern: ^\+94\d{9}$) */
  mobile: Scalars['String']['input'];
  /** @constraint(minLength: 4) */
  password: Scalars['String']['input'];
  /** @constraint(pattern: ^[a-zA-Z0-9\s]{3,20}$) */
  preferredName: Scalars['String']['input'];
};

export type UserRating = {
  __typename?: 'UserRating';
  asHost: HostRating;
  asRequester: RequesterRating;
};

export type Vehicle = {
  __typename?: 'Vehicle';
  _id?: Maybe<Scalars['ObjectId']['output']>;
  class: VehicleClass;
  features: VehicleFeatures;
  isActive: Scalars['Boolean']['output'];
  model: Scalars['String']['output'];
  name: Scalars['String']['output'];
  number: Scalars['String']['output'];
  rating: VehicleRating;
  type: VehicleType;
};

export enum VehicleClass {
  BIKE = 'BIKE',
  CAR = 'CAR',
  LORRY = 'LORRY',
  THREE_WHEELER = 'THREE_WHEELER',
  VAN = 'VAN'
}

export type VehicleFeatures = {
  __typename?: 'VehicleFeatures';
  ac: Scalars['Boolean']['output'];
  luggage: Scalars['Boolean']['output'];
};

export type VehicleFeaturesInput = {
  ac: Scalars['Boolean']['input'];
  luggage: Scalars['Boolean']['input'];
};

export type VehicleInput = {
  class: VehicleClass;
  features: VehicleFeaturesInput;
  /** @constraint(pattern: ^[a-zA-Z0-9\s]{3,20}$) */
  model: Scalars['String']['input'];
  /** @constraint(pattern: ^[a-zA-Z0-9\s]{3,20}$) */
  name: Scalars['String']['input'];
  /** @constraint(pattern: ^[a-zA-Z0-9\s]{3,20}$) */
  number: Scalars['String']['input'];
  type: VehicleType;
};

export type VehicleRating = {
  __typename?: 'VehicleRating';
  ac: Scalars['Float']['output'];
  cleanliness: Scalars['Float']['output'];
};

export enum VehicleType {
  HIRED = 'HIRED',
  PERSONAL = 'PERSONAL',
  STAFF_SERVICE = 'STAFF_SERVICE'
}
