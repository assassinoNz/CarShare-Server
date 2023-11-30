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
  ownerId: Scalars['ObjectId']['output'];
};

export type Handshake = {
  __typename?: 'Handshake';
  _id: Scalars['ObjectId']['output'];
  hostedTripId: Scalars['ObjectId']['output'];
  payment: Payment;
  rating: TripRating;
  recipientId: Scalars['ObjectId']['output'];
  requestedTripId: Scalars['ObjectId']['output'];
  senderId: Scalars['ObjectId']['output'];
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
  hostId: Scalars['ObjectId']['output'];
  route: HostedTripRoute;
  seats: Scalars['Int']['output'];
  time: TripTime;
  vehicle?: Maybe<Vehicle>;
  vehicleId?: Maybe<Scalars['ObjectId']['output']>;
};

export type HostedTripInput = {
  billing: TripBillingInput;
  route: HostedTripRouteInput;
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
  keyCoords: Array<Array<Scalars['Float']['input']>>;
  polyLines: Array<Scalars['String']['input']>;
  to: Scalars['String']['input'];
};

export type Module = {
  __typename?: 'Module';
  _id: Scalars['ObjectId']['output'];
  name: Scalars['String']['output'];
};

export type Mutation = {
  __typename?: 'Mutation';
  CreateHostedTrip: Scalars['ObjectId']['output'];
  CreateUser: Scalars['ObjectId']['output'];
  SignIn: Scalars['String']['output'];
};


export type MutationCreateHostedTripArgs = {
  hostedTrip: HostedTripInput;
};


export type MutationCreateUserArgs = {
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

export type Permission = {
  __typename?: 'Permission';
  _id: Scalars['ObjectId']['output'];
  moduleId: Scalars['ObjectId']['output'];
  value: Scalars['String']['output'];
};

export type Query = {
  __typename?: 'Query';
  GetMatchingRequestedTrips: Array<RequestedTripMatch>;
  GetMe: User;
  GetMyBankAccounts: Array<BankAccount>;
  GetMyHostedTrips: Array<Maybe<HostedTrip>>;
  GetMyReceivedHandshakes: Array<Maybe<Handshake>>;
  GetMyRequestedTrips: Array<Maybe<RequestedTrip>>;
  GetMySentHandshakes: Array<Maybe<Handshake>>;
  GetMyVehicles: Array<Vehicle>;
};


export type QueryGetMatchingRequestedTripsArgs = {
  hostedTripId: Scalars['ObjectId']['input'];
};

export type RequestedTrip = {
  __typename?: 'RequestedTrip';
  _id: Scalars['ObjectId']['output'];
  requesterId: Scalars['ObjectId']['output'];
  route: RequestedTripRoute;
  seats: Scalars['Int']['output'];
  time: TripTime;
};

export type RequestedTripMatch = {
  __typename?: 'RequestedTripMatch';
  requestedTripId: Scalars['ObjectId']['output'];
  results: Array<TripMatchResult>;
};

export type RequestedTripRoute = {
  __typename?: 'RequestedTripRoute';
  from: Scalars['String']['output'];
  keyCoords: Array<Array<Scalars['Float']['output']>>;
  to: Scalars['String']['output'];
};

export type RequesterRating = {
  __typename?: 'RequesterRating';
  politeness: Scalars['Float']['output'];
  punctuality: Scalars['Float']['output'];
};

export type Role = {
  __typename?: 'Role';
  _id: Scalars['ObjectId']['output'];
  name: Scalars['String']['output'];
  permissions: Array<Permission>;
};

export type Secret = {
  __typename?: 'Secret';
  hash: Scalars['String']['output'];
};

export type TripBilling = {
  __typename?: 'TripBilling';
  bankAccountId: Scalars['ObjectId']['output'];
  priceFirstKm: Scalars['Float']['output'];
  priceNextKm: Scalars['Float']['output'];
};

export type TripBillingInput = {
  bankAccountId: Scalars['ObjectId']['input'];
  priceFirstKm: Scalars['Float']['input'];
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
  roleId: Scalars['ObjectId']['output'];
  secret: Secret;
};

export type UserInput = {
  email: Scalars['String']['input'];
  isActive: Scalars['Boolean']['input'];
  mobile: Scalars['String']['input'];
  preferredName: Scalars['String']['input'];
  rating: UserRating;
  roleId: Scalars['ObjectId']['input'];
  secret: Secret;
};

export type UserRating = {
  __typename?: 'UserRating';
  asHost: HostRating;
  asRequester: RequesterRating;
};

export type Vehicle = {
  __typename?: 'Vehicle';
  _id: Scalars['ObjectId']['output'];
  features: VehicleFeatures;
  isActive: Scalars['Boolean']['output'];
  model: Scalars['String']['output'];
  name: Scalars['String']['output'];
  number: Scalars['String']['output'];
  ownerId: Scalars['ObjectId']['output'];
  rating: VehicleRating;
};

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
  features: VehicleFeaturesInput;
  isActive: Scalars['Boolean']['input'];
  model: Scalars['String']['input'];
  name: Scalars['String']['input'];
  number: Scalars['String']['input'];
  rating: VehicleRating;
};

export type VehicleRating = {
  __typename?: 'VehicleRating';
  ac: Scalars['Float']['output'];
  cleanliness: Scalars['Float']['output'];
};
