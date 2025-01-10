const express = require("express");
const WebSocket = require("websocket").server;
const http = require("http");
const { getPositions } = require("./controllers/positionsController");
const { getAlerts } = require("./controllers/alertController");
const { getData } = require("./config/constantes");

const app = express();
const server = http.createServer(app);
const wsServer = new WebSocket({
  httpServer: server,
  autoAcceptConnections: false,
});

const timeStep = 5000; // 5 seconds
const PORT = 3050;

// Global storage for latest data
const latestData = {
  positions: [],
  alerts: [],
};

// Single interval for data fetching
const startDataFetching = () => {
  setInterval(() => {
    // Fetch positions
    getPositions((err, positions) => {
      if (!err) latestData.positions = positions;
    });

    // Fetch alerts
    getAlerts(timeStep, (err, alerts) => {
      if (!err) latestData.alerts = alerts;
    });
  }, timeStep);
};

// Start fetching data when server starts
startDataFetching();

wsServer.on("request", async (request) => {
  const url = request.resourceURL.path;
  const queryParams = new URLSearchParams(request.resourceURL.query);
  const username = queryParams.get("u");
  const password = queryParams.get("p");

  if (!username || !password) {
    request.reject();
    console.log("Connection rejected: Authentication required");
    return;
  }

  let devices = await getData(username, password);
  if (!devices) {
    request.reject();
    console.log("Connection rejected: Invalid credentials");
    return;
  }

  const connection = request.accept(null, request.origin);
  const path = url.split("?")[0];

  // Send initial data and setup interval for updates
  let interval;
  switch (path) {
    case "/positions":
      const enrichPositions = async () => {
        devices = await getData(username, password);
        const enrichedPositions = latestData.positions
          .filter((position) =>
            devices.some((device) => device.id === position.deviceid)
          )
          .map((position) => {
            const device = devices.find(
              (device) => device.id === position.deviceid
            );
            return {
              ...position,
              attributes: JSON.parse(position.attributes),
              deviceName: device.name,
              deviceModel: device.model,
              deviceStatus: device.status,
              devicePhone: device.phone,
              deviceContact: device.contact,
              deviceCategory: device.category,
            };
          });

        connection.send(JSON.stringify({ positions: enrichedPositions }));
      };

      // Initial send
      enrichPositions();

      // Set interval
      interval = setInterval(() => {
        enrichPositions();
      }, timeStep);
      break;
    case "/alerts":
      const enrichAlerts = () => {
        // Filter and combine data
        const enrichedAlerts = latestData.alerts
          .filter((alert) =>
            devices.some((device) => device.id === alert.deviceid)
          )
          .map((alert) => {
            const device = devices.find(
              (device) => device.id === alert.deviceid
            );
            return {
              ...alert,
              deviceName: device.name,
              deviceModel: device.model,
              deviceStatus: device.status,
              devicePhone: device.phone,
              deviceContact: device.contact,
            };
          });

        // Send combined data
        connection.send(JSON.stringify({ alerts: enrichedAlerts }));
      };

      // Initial send
      enrichAlerts();

      // Set interval
      interval = setInterval(() => {
        enrichAlerts();
      }, timeStep);
      break;
    default:
      connection.send(JSON.stringify({ error: "Invalid path" }));
      connection.close();
      return;
  }

  connection.on("close", () => {
    if (interval) {
      clearInterval(interval);
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
