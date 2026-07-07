function getRequiredEnv(name) {

    const value = process.env[name];
  
    if (!value || value.trim() === "") {
  
      throw new Error(
        `Missing required environment variable: ${name}`
      );
  
    }
  
    return value.trim();
  
  }
  
  function normalizeBaseUrl(url) {
  
    return url.replace(/\/+$/, "");
  
  }
  
  const config = {
  
    baseUrl: normalizeBaseUrl(
      getRequiredEnv("ROUTESTACK_BASE_URL")
    ),
  
    apiKey: getRequiredEnv("ROUTESTACK_API_KEY"),
  
    apiSecret: getRequiredEnv("ROUTESTACK_API_SECRET"),
  
  };
  
  module.exports = config;