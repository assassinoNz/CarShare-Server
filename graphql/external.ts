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
  ObjectId: { input: ID; output: ID; }
};

export type BankAccount = {
  __typename?: 'BankAccount';
  _id: Scalars['ObjectId']['output'];
  account: Scalars['String']['output'];
  bank: Scalars['String']['output'];
  branch: Scalars['String']['output'];
  name: Scalars['String']['output'];
};

export type HostedTrip = {
  __typename?: 'HostedTrip';
  billing: TripBilling;
  host: User;
  rating: TripRating;
  route: Route;
  seats: Scalars['Int']['output'];
  time: TripTime;
  vehicle: Vehicle;
};

export type Module = {
  __typename?: 'Module';
  name: Scalars['String']['output'];
};

export type Mutation = {
  __typename?: 'Mutation';
  SignIn: Scalars['String']['output'];
};


export type MutationSignInArgs = {
  password: Scalars['String']['input'];
  username: Scalars['String']['input'];
};

export type Notification = {
  __typename?: 'Notification';
  acceptedByHost: Scalars['Boolean']['output'];
  acceptedByRequester: Scalars['Boolean']['output'];
  hostedTripId: Scalars['ObjectId']['output'];
  payment: Payment;
  requestedTripId: Scalars['ObjectId']['output'];
};

export type Payment = {
  __typename?: 'Payment';
  amount: Scalars['Float']['output'];
  time?: Maybe<Scalars['Date']['output']>;
};

export type Permission = {
  __typename?: 'Permission';
  module: Module;
  value: Scalars['String']['output'];
};

export type Query = {
  __typename?: 'Query';
  GetMe: User;
  GetUser: User;
};


export type QueryGetUserArgs = {
  id: Scalars['ObjectId']['input'];
};

export type RequestedTrip = {
  __typename?: 'RequestedTrip';
  requester: User;
  route: Route;
  seats: Scalars['Int']['output'];
  time: TripTime;
};

export type Role = {
  __typename?: 'Role';
  name: Scalars['String']['output'];
  permissions: Array<Permission>;
};

export type Route = {
  __typename?: 'Route';
  from: Scalars['String']['output'];
  keyCoords?: Maybe<Array<Array<Scalars['Float']['output']>>>;
  polyLines?: Maybe<Array<Scalars['String']['output']>>;
  to: Scalars['String']['output'];
};

export type TripBilling = {
  __typename?: 'TripBilling';
  bankAccount: BankAccount;
  priceFirstKm: Scalars['Float']['output'];
  priceNextKm: Scalars['Float']['output'];
};

export type TripRating = {
  __typename?: 'TripRating';
  driving: Scalars['Float']['output'];
  meetsCondition: Scalars['Float']['output'];
  politeness: Scalars['Float']['output'];
  punctuality: Scalars['Float']['output'];
};

export type TripTime = {
  __typename?: 'TripTime';
  end?: Maybe<Scalars['Date']['output']>;
  schedule: Scalars['Date']['output'];
  start?: Maybe<Scalars['Date']['output']>;
};

export type User = {
  __typename?: 'User';
  _id: Scalars['ObjectId']['output'];
  bankAccounts: Array<BankAccount>;
  currentCoord?: Maybe<Array<Scalars['Float']['output']>>;
  preferredName: Scalars['String']['output'];
  rating: UserRating;
  username: Scalars['String']['output'];
  vehicles: Array<Vehicle>;
};

export type UserRating = {
  __typename?: 'UserRating';
  driving: Scalars['Float']['output'];
  politeness: Scalars['Float']['output'];
  punctuality: Scalars['Float']['output'];
};

export type Vehicle = {
  __typename?: 'Vehicle';
  features: VehicleFeatures;
  model: Scalars['String']['output'];
  name: Scalars['String']['output'];
  number: Scalars['String']['output'];
  rating: VehicleRating;
};

export type VehicleFeatures = {
  __typename?: 'VehicleFeatures';
  ac: Scalars['Boolean']['output'];
  luggage: Scalars['Boolean']['output'];
};

export type VehicleRating = {
  __typename?: 'VehicleRating';
  ac: Scalars['Float']['output'];
  cleanliness: Scalars['Float']['output'];
};
