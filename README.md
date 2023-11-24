# CarShare

## Prerequisites
- MongoDB (Tested on 7.0.3)
- PostgresSQL (Tested on 16.1)
- PostGIS (Tested on 3)
- node.js (Tested with 20.10.0)
- npm (Tested on 10.2.3)

## Initial Setup
### Create the minimal MongoDB schema

- `$ mongosh`
- `load('etc/db.mongodb');`
- Make sure the database `carshare` is created

### Create the minimal PostgreSQL schema

- `$ sudo -u postgres psql`
- `ALTER USER postgres WITH PASSWORD '<password>';`
- `CREATE DATABASE carshare;`
- `\c carshare;`
- `CREATE EXTENSION postgis;`

### Install dependencies

- `$ npm i`

### Build OSRM Data

Download `sri-lanka-latest.osm.pbf` to any directory and within that directory, tun the following commands sequentially.

- `docker run -t -v "${PWD}:/data" ghcr.io/project-osrm/osrm-backend osrm-extract -p /opt/car.lua /data/sri-lanka-latest.osm.pbf`

- `docker run -t -v "${PWD}:/data" ghcr.io/project-osrm/osrm-backend osrm-partition /data/sri-lanka-latest.osrm`

- `docker run -t -v "${PWD}:/data" ghcr.io/project-osrm/osrm-backend osrm-customize /data/sri-lanka-latest.osrm`

### Create and update configuration Variables

- `$ cp etc/sampleConfig.ts config.ts`
- Modify the values in `config.ts` accordingly.

## Start Services
### Start database deamons
- `$ sudo systemctl start mongod`

- `$ sudo systemctl start postgresql`

### Start OSRM (OpenSource Routing Machine)

Withing the previously created OSRM data directory, run the following.

- `docker run -t -i -p 5000:5000 -v "${PWD}:/data" ghcr.io/project-osrm/osrm-backend osrm-routed --algorithm mld /data/sri-lanka-latest.osrm`

### Start API server

- `$ npm start`
- Visit `localhost:<PORT_EXPRESS>` in a browser to access the GraphQL sandbox.