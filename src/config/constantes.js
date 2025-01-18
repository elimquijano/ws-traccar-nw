require("dotenv").config();

const BASE_URL_TRACCAR = process.env.BASE_URL_TRACCAR;
const API_URL_DEVICES = BASE_URL_TRACCAR + "devices";

const getData = async (username, password, details) => {

  try {
    const token = Buffer.from(`${username}:${password}`).toString("base64");

    const response = await fetch(API_URL_DEVICES, {
      method: "GET",
      headers: {
        Authorization: `Basic ${token}`,
      },
    });

    if (response.ok) {
      const data = await response.json();

      const mergedResults = data.map((device) => {
        const result = details.find((res) => res.id === device.id);
        return {
          ...device,
          icon: result ? result.url : null,
        };
      });

      return mergedResults;
    }
    return null;
  } catch (error) {
    console.error("Request error:", error);
    return null;
  }
};

module.exports = { getData };
