import * as geoIp from "geoip-country";

const getIp = (req) => {
	let ip = req.socket.remoteAddress || req.headers["x-forwarded-for"];
	if(!ip || ip == undefined || ip == null) return "";
	ip = ip.replace("::ffff:", "");

	if (ip == "127.0.0.1") {
		ip = req.headers["x-real-ip"];
	}
	return ip;
};

export const detectCountry = (req) => {
	const ip = getIp(req);
	return geoIp.lookup(ip)?.country;
};
