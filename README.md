# Binance

## Prerequisites
- MongoDB
- node.js (Tested with 20.5.1)
- npm

## Install dependencies

- Run `npm i`

## Create the minimal schema

- Login to your MongoDB instance and run the script in `etc/db.mongodb`
- Make sure the database `carshare` is created

## Create and update configuration

- Run `touch config.ts` in the terminal
- Inside `config.ts` Add
    - `export const SECRET_JWT = "Hello World;";`
    - `export const URL_DB_MONGO = "mongodb://localhost";`
    - `export const PORT_EXPRESS = process.env.PORT || 8080;`
    - `export const NAME_DB = "carshare";`
- Replace the `<username>, <password>, <database_ip>` with your credentials

## Start

- Run `npm start`
- Visit `<server_ip>:8080` in a browser to access the GraphQL sandbox