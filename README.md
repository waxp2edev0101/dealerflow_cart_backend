# Marketplace-v2-API

## Name

Marketplace-v2 API development.

## Description



## Installation

Clone repository, then install dependencies with:

```bash
npm i
```

### Local NodeJS

Create a `.env` file in the root project directory that looks like this, or set these environment variables:

```bash
MONGODB_CONNECTION_STRING=mongodb+srv://{DB_USER}:{DB_PASSWORD}@{DB_HOST_ADDRESS}

MONGODB_VEHICLES_DB=name_of_database
MONGODB_VEHICLES_COLLECTION=name_of_collection

BASE_PORT=3000
BASE_URL=http://localhost:3000 # Port should match port above, unless standard HTTP/HTTPS.
BASE_GUI_URL=''
SUPPORT_URL=''

SERVERLESS=0
```

Compile and run with:

```bash
npm start
```

### Mongodb

Import database from json Mock file using mongoimport

```bash
mongoimport --db name_of_database --collection name_of_collection --file path_of_file --upsert --upsertFields _id
```

### Serverless.com

Make sure you have the `serverless` CLI tool from serverless.com installed and configured correctly with AWS credentials.

Create a `serverless-dev.yml` or `serverless-prod.yml` file in the root project directory that looks like this:

```yaml
service: 

plugins:
  - serverless-offline
provider:
  name: aws
  runtime: nodejs18.x
  stage: dev
  region: us-east-1
  timeout: 15
  apiGateway:
    minimumCompressionSize: 1024
  environment:
    MONGODB_CONNECTION_STRING: mongodb+srv://{DB_USER}:{DB_PASSWORD}@{DB_HOST_ADDRESS}

    MONGODB_VEHICLES_DB: inventory
    MONGODB_VEHICLES_COLLECTION_CDN: cdn-inventory
    MONGODB_VEHICLES_COLLECTION_US: us-inventory
    
    BASE_URL: "" # The base URL of the serverless function, may need to deploy twice at first to get this.
    BASE_GUI_URL: ''
    SUPPORT_URL: ''

functions:
  app:
    handler: dist/index.handler
    events:
      - http: ANY /
      - http: "ANY /{proxy+}"
```

Compile and run locally with:

```bash
npm run deploy-local
```

Compile and deploy to serverless.com with :

Dev:

```bash
npm run deploy-dev
```

Prod:

```bash
npm run deploy-prod
```

## Usage

These are the endpoints:

- /vehicles
- /vehicle
- /price-range
- /year-range
- /mileage-range
- /make-list
- /models
- /trims

---

###  /vehicles

Takes in the following as JSON body in POST request:

Request

```json
POST /vehicles
{
    "vehicle_make": "Ford",
    "listing_mileage_min": 0,
    "listing_mileage_max": 430000,
    "vehicle_fuel_types": ["Diesel", "Gasoline"],
    "vehicle_engine_cylinders": ["8", "2", "8+", ""],
    "vehicle_year_min": 2021,
    "vehicle_year_max": 2024,
    "listing_price_min": 10000,
    "listing_price_max": 81700,
    "vehicle_transmission_types": ["Manual", "Automatic"],
    "vehicle_drivetrains": ["AWD"],
    "listing_price_order": -1,
    "location": [100, 100],
    "distance": 20000,
    "skip": 20
}
```

Response

```json

   {
        "_id": "6468131726048f5b522229c1",
        "vin": "1FM5K8GC9NGC27096",
        "certified_preowned_flag": "",
        "date_max": "2023-06-23",
        "date_min": "2023-03-27",
        "id": "-3747831252722129746",
        "listing_description": "3rd ...~~Disc",
        "listing_features": "Navigation System, ... , Heated Seats",
        "listing_mileage": "1841.0",
        ...
        "converted_engine_cylinders": 0,
        "converted_listing_price": {
            "$numberDecimal": "66423"
        },
        "distance": 218.58498987663694
    },
```

### /vehicle

This api endpoint handles Get request and reply with response to read a vehicle by its id

Request

```
GET /vehicle?id=6441de37e8bc77d30d52a6f3

```

Response

```json
{
    "_id": "6441de37e8bc77d30d52a6f3",
    "id": "2392269103926487876",
    "vin": "5UXTS3C51K0Z04036",
    ...
    "vehicle_transmission_speed": "",
    "vehicle_truck_bed_style": "",
    "vehicle_truck_cab_style": ""
}
```

### /price-range

Handle Get request to get vehicle price range, minimum and maximum price of vehicle rounded up to the nearest hundred

Request

```
GET /price-range

```

Response

```json
{
    "max": 100000,
    "min": 0
}
```

### /year-range

Handle Get request to get vehicle year range, minimum and maximum value year of vehicle

Request

```
GET /year-range

```

Response
```json
{
    "max_vehicle_year": "2024",
    "min_vehicle_year": 0
}
```

### /mileage-range

Handle Get request to get vehicle year range, minimum and maximum value year of vehicle

Request

```
GET /mileage-range
```

Response
```json
{
    "max_listing_mileage": "99993",
    "min_listing_mileage": 0
}
```

### /make-list
Get similar make list by given make string

Request
```
Get /make-list?make=to
```

Response
```json
[
    {
        "_id": "Autozam"
    },
    {
        "_id": "Aston Martin"
    },
    {
        "_id": "Nissan LEAF SV LOW KMS SALE PRICED VOLUME DEALER, PRICED TO MOVE!"
    },
    {
        "_id": "Toyota"
    },
    {
        "_id": "Keystone RV"
    }
]
```

### /models
Get vehicle models list by vehicle make

Request
```
Get /models?make=bmw
```

Response
```json
[
    {
        "_id": "Z4 M"
    },
    {
        "_id": "335 Xdrive Sedan in North Vancouver"
    },
    ...
    {
        "_id": "750i"
    },
    {
        "_id": "x3"
    },
    {
        "_id": "4 Series"
    }
]
```

### /trims
Get vehicle trim list by vehicle make and model

Request
```json
POST /trims

{
    "make": "bmw",
    "model": "M440"
}
```

Response
```json
[
    {
        "_id": "i xDrive 2dr All-Wheel Drive Coupe"
    },
    {
        "_id": "i xDrive 2dr All-Wheel Drive Cabriolet"
    }
]
```

## Authors and acknowledgment


## Project status

In Development.
