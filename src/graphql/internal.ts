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

export type BankAccountInput = {
  bank: Scalars['String']['input'];
  branch: Scalars['String']['input'];
  isActive: Scalars['Boolean']['input'];
  name: Scalars['String']['input'];
  number: Scalars['String']['input'];
  ownerId: Scalars['ObjectId']['input'];
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

export type HandshakeInput = {
  hostedTripId: Scalars['ObjectId']['input'];
  payment: Payment;
  rating: TripRating;
  recipientId: Scalars['ObjectId']['input'];
  requestedTripId: Scalars['ObjectId']['input'];
  senderId: Scalars['ObjectId']['input'];
  time: HandshakeTime;
};

export enum HandshakeState {
  ACCEPTED = 'ACCEPTED',
  CANCELLED = 'CANCELLED',
  CONFIRMED_ACCEPTED = 'CONFIRMED_ACCEPTED',
  CONFIRMED_ENDED_REQUESTED_TRIP = 'CONFIRMED_ENDED_REQUESTED_TRIP',
  CONFIRMED_STARTED_REQUESTED_TRIP = 'CONFIRMED_STARTED_REQUESTED_TRIP',
  DONE_PAYMENT = 'DONE_PAYMENT',
  ENDED_HOSTED_TRIP = 'ENDED_HOSTED_TRIP',
  ENDED_REQUESTED_TRIP = 'ENDED_REQUESTED_TRIP',
  SEEN = 'SEEN',
  SENT = 'SENT',
  STARTED_HOSTED_TRIP = 'STARTED_HOSTED_TRIP',
  STARTED_REQUESTED_TRIP = 'STARTED_REQUESTED_TRIP'
}

export type HandshakeTime = {
  __typename?: 'HandshakeTime';
  accepted?: Maybe<Scalars['Date']['output']>;
  cancelled?: Maybe<Scalars['Date']['output']>;
  confirmedRequestedTripEnd?: Maybe<Scalars['Date']['output']>;
  confirmedRequestedTripStart?: Maybe<Scalars['Date']['output']>;
  endedRequestedTrip?: Maybe<Scalars['Date']['output']>;
  initiated: Scalars['Date']['output'];
  paymentDone?: Maybe<Scalars['Date']['output']>;
  seen?: Maybe<Scalars['Date']['output']>;
  sent?: Maybe<Scalars['Date']['output']>;
  startedRequestedTrip?: Maybe<Scalars['Date']['output']>;
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
  remainingSeats: Scalars['Int']['output'];
  route: HostedTripRoute;
  seats: Scalars['Int']['output'];
  time: TripTime;
  vehicle?: Maybe<Vehicle>;
  vehicleId?: Maybe<Scalars['ObjectId']['output']>;
};

export type HostedTripInput = {
  billing: TripBillingInput;
  hostId: Scalars['ObjectId']['input'];
  remainingSeats: Scalars['Int']['input'];
  route: HostedTripRouteInput;
  seats: Scalars['Int']['input'];
  time: TripTimeInput;
  vehicle?: InputMaybe<VehicleInput>;
  vehicleId?: InputMaybe<Scalars['ObjectId']['input']>;
};

export type HostedTripRoute = {
  __typename?: 'HostedTripRoute';
  ended?: Maybe<Array<Array<Scalars['Float']['output']>>>;
  from: Scalars['String']['output'];
  keyCoords: Array<Array<Scalars['Float']['output']>>;
  polyLines: Array<Scalars['String']['output']>;
  started?: Maybe<Array<Array<Scalars['Float']['output']>>>;
  tileOverlapIndex: Scalars['String']['output'];
  to: Scalars['String']['output'];
};

export type HostedTripRouteInput = {
  from: Scalars['String']['input'];
  keyCoords: Array<Array<Scalars['Float']['input']>>;
  polyLines: Array<Scalars['String']['input']>;
  tileOverlapIndex: Scalars['String']['input'];
  to: Scalars['String']['input'];
};

export type Module = {
  __typename?: 'Module';
  _id: Scalars['ObjectId']['output'];
  name: Scalars['String']['output'];
};

export type Mutation = {
  __typename?: 'Mutation';
  AddBankAccount: Scalars['ObjectId']['output'];
  AddHostedTrip: Scalars['ObjectId']['output'];
  AddRequestedTrip: Scalars['ObjectId']['output'];
  AddVehicle: Scalars['ObjectId']['output'];
  CreateGenericUser: Scalars['String']['output'];
  InitHandshake: Scalars['ObjectId']['output'];
  SignIn: Scalars['String']['output'];
  UpdateHandshakeState: Scalars['Boolean']['output'];
  UpdateHostedTripState: Scalars['Boolean']['output'];
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


export type MutationInitHandshakeArgs = {
  hostedTripId: Scalars['ObjectId']['input'];
  requestedTripId: Scalars['ObjectId']['input'];
};


export type MutationSignInArgs = {
  mobile: Scalars['String']['input'];
  password: Scalars['String']['input'];
};


export type MutationUpdateHandshakeStateArgs = {
  coord?: InputMaybe<Array<Scalars['Float']['input']>>;
  handshakeId: Scalars['ObjectId']['input'];
  state: HandshakeState;
};


export type MutationUpdateHostedTripStateArgs = {
  coord: Array<Scalars['Float']['input']>;
  hostedTripId: Scalars['ObjectId']['input'];
  state: TripState;
};

export type Payment = {
  __typename?: 'Payment';
  amount: Scalars['Float']['output'];
};

export type Permission = {
  __typename?: 'Permission';
  _id: Scalars['ObjectId']['output'];
  moduleId: Scalars['ObjectId']['output'];
  value: Scalars['String']['output'];
};

export type Query = {
  __typename?: 'Query';
  GetMatchingRequestedTrips: Array<RequestedTrip>;
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
  state?: InputMaybe<HandshakeState>;
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
  requesterId: Scalars['ObjectId']['output'];
  route: RequestedTripRoute;
  seats: Scalars['Int']['output'];
  time: TripTime;
  vehicleFeatures: RequestedVehicleFeatures;
};

export type RequestedTripInput = {
  requesterId: Scalars['ObjectId']['input'];
  route: RequestedTripRouteInput;
  seats: Scalars['Int']['input'];
  time: TripTimeInput;
  vehicleFeatures: RequestedVehicleFeaturesInput;
};

export type RequestedTripRoute = {
  __typename?: 'RequestedTripRoute';
  ended?: Maybe<Array<Array<Scalars['Float']['output']>>>;
  from: Scalars['String']['output'];
  keyCoords: Array<Array<Scalars['Float']['output']>>;
  started?: Maybe<Array<Array<Scalars['Float']['output']>>>;
  tileOverlapIndex: Scalars['String']['output'];
  to: Scalars['String']['output'];
};

export type RequestedTripRouteInput = {
  from: Scalars['String']['input'];
  keyCoords: Array<Array<Scalars['Float']['input']>>;
  tileOverlapIndex: Scalars['String']['input'];
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

export type TripRating = {
  __typename?: 'TripRating';
  host: HostRating;
  requester: RequesterRating;
  vehicle: VehicleRating;
};

export enum TripState {
  ENDED = 'ENDED',
  STARTED = 'STARTED'
}

export type TripTime = {
  __typename?: 'TripTime';
  ended?: Maybe<Scalars['Date']['output']>;
  schedule: Scalars['Date']['output'];
  started?: Maybe<Scalars['Date']['output']>;
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
  _id?: Maybe<Scalars['ObjectId']['output']>;
  class: VehicleClass;
  features: VehicleFeatures;
  isActive: Scalars['Boolean']['output'];
  model: Scalars['String']['output'];
  name: Scalars['String']['output'];
  number: Scalars['String']['output'];
  ownerId?: Maybe<Scalars['ObjectId']['output']>;
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
  isActive: Scalars['Boolean']['input'];
  model: Scalars['String']['input'];
  name: Scalars['String']['input'];
  number: Scalars['String']['input'];
  ownerId?: InputMaybe<Scalars['ObjectId']['input']>;
  rating: VehicleRating;
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
