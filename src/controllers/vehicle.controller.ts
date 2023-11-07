import { debug } from "..";
import connect from "../mongoose-connect";
import { VehicleSchema } from "../models";
import { Decimal128 } from "mongodb";
import { detectCountry } from "../utils";

const round = 100;
// Vehicle Controller
export default function(app) {
	// Search vehicles
	let connection;
	let VehicleModel;

	const createConnection = async (req, res) => {
		const country = detectCountry(req);
		
		const collection = (country && country.toLowerCase() === "us")
			? process.env.MONGODB_VEHICLES_COLLECTION_US
			: process.env.MONGODB_VEHICLES_COLLECTION_CDN;
		try {
			connection = await connect(process.env.MONGODB_VEHICLES_DB);
			VehicleModel = connection.model(
				collection,
				VehicleSchema,
				collection
			);
		} catch (error) {
			debug(error);
			return res.status(500).send({
				data: {
					message: "Internal server error (db connect)."
				}
			});
		}
	};

	// Post request and response to read vehicles information under specific search criteria
	app.post("/vehicles", async function(req, res) {

		debug("start /vehicles");

		debug("start mongoose");
        
		await createConnection(req, res);

		debug("end mongoose");

		const {
			vehicle_make,
			vehicle_model,
			vehicle_trim,
			vehicle_year_min,
			vehicle_year_max,
			listing_mileage_min,
			listing_mileage_max,
			listing_price_min,
			listing_price_max,
			vehicle_fuel_types,
			vehicle_engine_cylinders,
			vehicle_drivetrains,
			vehicle_transmission_types,
			va_seller_zip,
			page,
			listing_price_order,
			location,
			distance,
			distance_unit,
		} = req.body;

		debug(`distance unit is ${distance_unit}`);

		const origin = location || [0 ,0];

		try {
			const pipeline: any[] = [
				{
					$addFields: {
						// convertedYear: { $toDecimal: "$vehicle_year" },
						converted_mileage: {
							$convert: {
								input: "$listing_mileage",
								to: "decimal",
								onError: 0,
								onNull: new Decimal128("0")
							}
						},
						converted_year: {
							$convert: {
								input: "$vehicle_year",
								to: "decimal",
								onError: 0,
								onNull: new Decimal128("0")
							}
						},
						converted_engine_cylinders: {
							$convert: {
								input: "$vehicle_engine_cylinders",
								to: "decimal",
								onError: 0,
								onNull: new Decimal128("0")
							}
						},
						converted_listing_price: {
							$convert: {
								input: "$listing_price",
								to: "decimal",
								onError: 0,
								onNull: new Decimal128("0")
							}
						},
						distance: {
							$function: {
								body: function(location, origin, distanceUnit = "K") {
									function getDistance(lat1, lon1, lat2, lon2, unit = "K") {
										if ((lat1 == lat2) && (lon1 == lon2)) {
											return 0;
										}
										else {
											const radlat1 = Math.PI * lat1/180;
											const radlat2 = Math.PI * lat2/180;
											const theta = lon1-lon2;
											const radtheta = Math.PI * theta/180;
											let dist = Math.sin(radlat1) * Math.sin(radlat2) + Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
											if (dist > 1) {
												dist = 1;
											}
											dist = Math.acos(dist);
											dist = dist * 180/Math.PI;
											dist = dist * 60 * 1.1515;
											if (unit=="K") { dist = dist * 1.609344; }
											if (unit=="N") { dist = dist * 0.8684; }
											return dist;
										}
									}
									return getDistance(location["coordinates"][0], location["coordinates"][1], origin[0], origin[1], distanceUnit);
								},
								args: ["$location", origin, distance_unit],
								lang: "js"
							}
						}
					}
				},
				{
                    
					$match: {
						$and: [
							// make
							vehicle_make ? { vehicle_make: { $regex: vehicle_make, $options: "i" } } : {},
							vehicle_model ? { vehicle_model: { $regex: vehicle_model, $options: "i" } } : {},
							vehicle_trim ? { vehicle_trim: { $regex: vehicle_trim, $options: "i" } } : {},
							// mileage
							(listing_mileage_min || listing_mileage_max) ? { 
								converted_mileage: { 
									$gte: listing_mileage_min, $lt: listing_mileage_max
								}
							}: {},
							// year
							(parseInt(vehicle_year_min, 10) !== 0 || parseInt(vehicle_year_max, 10) !== 0) ? {
								converted_year: { $gte: vehicle_year_min, $lte: vehicle_year_max }
							} : {},
							// fuel
							vehicle_fuel_types.length > 0 ? { 
								vehicle_fuel_type: {
									$in: vehicle_fuel_types
								}
							}: {},
							// cylinders
							vehicle_engine_cylinders.length > 0 ? vehicle_engine_cylinders.indexOf("8+") > -1 ? {

								$or: [
									{
										vehicle_engine_cylinders: {
											$in: vehicle_engine_cylinders
										}
									},
									{
										converted_engine_cylinders: {
											$gt: 8
										}
									}
								]
							} :{
								vehicle_engine_cylinders: {
									$in: vehicle_engine_cylinders
								}
							}: {},
							// vehicle_drivetrain
							vehicle_drivetrains.length > 0 ? { vehicle_drivetrain: { $in: vehicle_drivetrains } } : {},
							// transmission
							(vehicle_transmission_types && vehicle_transmission_types.length > 0) ? {
								vehicle_transmission_type: {
									$in: vehicle_transmission_types
								}
							} : {},
							va_seller_zip ? { va_seller_zip: { $eq: va_seller_zip } } : {},
							// price
							(parseInt(listing_price_min, 10) !== 0 || parseInt(listing_price_max, 10) !== 0) ? { 
								converted_listing_price: { 
									$gte: listing_price_min, $lt: listing_price_max 
								}
							} : {},
							(distance && distance > 0) ? { distance: { $lte: distance } } : {},
						]
					}
				},
				{
					$sort: {
						listing_price: listing_price_order
					}
				},
				{
					$facet: {
						products: [{ $skip: page * 20 }, { $limit: 20 }],
						totalCount: [
							{
								$count: "count"
							}
						]
					}
				}
			];


			const result = await VehicleModel.aggregate(pipeline).exec();
			// const result = await VehicleModel.find({});

			debug(`found ${result[0].totalCount[0].count} items`);

			return res.send({ products: result[0]["products"], count: result[0].totalCount[0].count });
		} catch (e) {

			return res.status(500).send({ message: e.message });
		}
	});

	// Handle Get request and reply with response to read a vehicle by its id
	app.get("/vehicle", async function (req, res) {
		debug(req.query.id);

		if (req.query.id) {
            
			await createConnection(req, res);
			const record = await VehicleModel.findById(req.query.id);
            
			return res.send(record);
		} else {

			return res.status(500).send({ message: "error" });
		}
	});
    
	// Handle Get request to get vehicle price range, minimum and maximum price of vehicle rounded up to the nearest hundred
	app.get("/price-range", async function (req, res) {

		debug("start /price-range");

		await createConnection(req, res);

		const range = await VehicleModel.aggregate([
			{
				$group: {
					_id: null,
					max_listing_price: { $max: "$listing_price" },
					min_listing_price: { $min: "$listing_price" },
				}
			}
		]).exec();

		debug(`${range[0]["min_listing_price"]}, ${range[0]["max_listing_price"]}`);

		return res.send({ max: Math.round((range[0]["max_listing_price"] || 0) / round) * round, min: Math.round((range[0]["min_listing_price"] || 0) / round) * round});
	});


	// Handle Get request to get vehicle year range, minimum and maximum value year of vehicle
	app.get("/year-range", async function (req, res) {

		debug("start /price-range");

		await createConnection(req, res);

		const range = await VehicleModel.aggregate([
			{
				$group: {
					_id: null,
					max: { $max: "$vehicle_year" },
					min: { $min: "$vehicle_year" },
				}
			}
		]).exec();
		debug(`${range[0]["min"]}, ${range[0]["max"]}`);

		return res.send({ max_vehicle_year: range[0]["max"] || 0, min_vehicle_year: range[0]["min"] || 0 });
	});

	// Handle Get request to get vehicle year range, minimum and maximum value year of vehicle
	app.get("/mileage-range", async function (req, res) {

		debug("start /mileage-range");

		await createConnection(req, res);

		const range = await VehicleModel.aggregate([
			{
				$group: {
					_id: null,
					max: { $max: "$listing_mileage" },
					min: { $min: "$listing_mileage" },
				}
			}
		]).exec();

		debug(`${range[0]["min"]}, ${range[0]["max"]}`);

		return res.send({ max_listing_mileage: range[0]["max"] || 0, min_listing_mileage: range[0]["min"] || 0 });
	});

	// Get make list
	app.get("/make-list", async function (req, res) {
		const { make } = req.query;
		await createConnection(req, res);

		let pipeline: any[] = [
			{
				$group: {
					_id: "$vehicle_make",
				}
			}, {
				
				$project: {
					vehicle_make: 1,
				},
			}
		];

		if (make) 
			pipeline = [{
				$match: {
					vehicle_make: { $regex: make, $options: "i" }
				},
			}, ...pipeline ];

		const makes = await VehicleModel.aggregate(pipeline).exec();

		debug(`found ${makes.length} items\n`);

		return res.send(makes);
	});

	// Get models 
	app.get("/models", async function(req, res) {

		const { make } = req.query;

		await createConnection(req, res);

		const pipeline: any[] = [
			{
				$match: {
					vehicle_make: { $regex: make, $options: "i" }
				},
			},
			{
				$group: {
					_id: "$vehicle_model",
				}
			}
		];

		const models = await VehicleModel.aggregate(pipeline).exec();

		return res.send(models);
	});

	// Post list trims
	app.post("/trims", async function(req, res) {

		const { make, model } = req.body;

		debug(`${make}, ${model}`);

		// return res.status(500).send({ message: "error" });

		await createConnection(req, res);

		const pipeline: any[] = [
			{
				$match: {
					vehicle_make: { $regex: make, $options: "i" },
					vehicle_model: { $regex: model, $options: "i" },
				},
			},
			{
				$group: {
					_id: "$vehicle_trim",
				}
			}
		];

		const trims = await VehicleModel.aggregate(pipeline).exec();

		return res.send(trims);
	});
}