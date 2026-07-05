const axios = require("axios");
const crypto = require("crypto");

const config = require("../config/routeStack");

async function getPartnerToken() {

  console.log("RouteStack Auth starting...");

  console.log("Base URL:", config.baseUrl);

  console.log("API Key Loaded:", !!config.apiKey);

  console.log("API Secret Loaded:", !!config.apiSecret);

}

module.exports = {
  getPartnerToken,
};