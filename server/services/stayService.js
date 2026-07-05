const axios = require("axios");

const config = require("../config/routeStack");

const { getToken } = require("./tokenManager");

const {
  mapDestinations,
} = require("../mappers/destinationMapper");

async function searchDestinations(query) {

  const token = await getToken();

  const response = await axios.post(
    `${config.baseUrl}/mcp/hotel/search-destinations`,
    {
      query,
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      timeout: 15000,
    }
  );

  return {
    success: response.data.success,
    message: response.data.message,
    destinations: mapDestinations(response.data.result),
  };
}

module.exports = {
  searchDestinations,
};