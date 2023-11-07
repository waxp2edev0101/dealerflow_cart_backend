import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import serverless from "serverless-http";

import vehicleController from "./controllers/vehicle.controller";

// Init API server
const app = express();
const port = process.env.BASE_PORT || 3000;

app.use(express.json());
app.use(cors());
app.use(function (req, res, next) {
	let allowOrigin = process.env.BASE_GUI_URL;
	const origin = req.get("Origin") ? req.get("Origin") : "";
	if (process.env.NODE_ENV == "dev" && allowOrigin != origin) {
		if (
			origin.indexOf("carbeeza.vercel.app") >= 0 ||
			origin.indexOf("http://localhost:3000") >= 0
		) {
			allowOrigin = origin;
		}
	}
	res.setHeader("Access-Control-Allow-Origin", allowOrigin);
	next();
});

// Handle request to vehicle
vehicleController(app);

// TODO REMOVE
app.get("/test", async function (req, res) {

	const stripeUrl = "";
	return res.status(200).send(
		buildPage(
			"Thank You! Your email has been verified.",
			`To complete your account setup and start your free trial, add a payment method by clicking the button below.</p>
				<table border="0" cellspacing="0" cellpadding="0" style="">
				<tr>
					<td style="padding: 12px 18px 12px 18px; border-radius:5px; background-color: #FFD750;" align="center">
						<a rel="noopener" target="_blank" href="${stripeUrl}" target="_blank" style="font-size: 18px; font-family: Helvetica, Arial, sans-serif; font-weight: bold; color: #826441; text-decoration: none; display: inline-block;">Activate Free Trial</a>
					</td>
				</tr>
			</table>
			<p>You will be brought to the check out page, where you can add a payment method for your new account.</p><p>No charges will be processed during the trial period, and you can cancel anytime before it ends.`
		)
	);
});


if (process.env.SERVERLESS === "0") {
	app.listen(port, () => {
		console.log(`API Listening at ${port}`);
	});
}

module.exports.handler = serverless(app);


const buildPage = function (heading: string, body: string) {
	return `<html>
		<body style="font-family: Arial, Helvetica, sans-serif;">
			<p>
			<img src="https://onboarding.ultralead.ai/logo.png" />
			</p>
			<div style="padding-left: 20px;padding-right: 20px;">
			<h1>${heading}</h1>
			<p>${body}</p>
			</div>
		</body>
		</html>`;
};

export const debug = function (data) {
	if (process.env.NODE_ENV === "dev") {
		console.log(data);
	}
};
