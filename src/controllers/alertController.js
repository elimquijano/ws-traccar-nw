const { db } = require("../config/db");
const { sendNotifications } = require("./notificacionController");

// Variable global para controlar si hay una consulta en proceso
let isQueryInProgress = false;

let sentAlertIds = [];
const maxIterations = 3;

const getAlerts = (timeStep, callback) => {
  // Si hay una consulta en proceso, cancelamos esta
  if (isQueryInProgress) {
    return;
  }

  isQueryInProgress = true;

  const secondsToSubtract = (4 * timeStep) / 1000;
  const now = new Date();
  now.setSeconds(now.getSeconds() - secondsToSubtract);
  const fiveSecondsAgo = now.toISOString().slice(0, 19).replace("T", " ");

  const query = `
    SELECT te.*, td.name, tp.latitude, tp.longitude FROM tc_events te 
    JOIN tc_devices td ON te.deviceid = td.id 
    LEFT JOIN tc_positions tp ON te.positionid = tp.id 
    WHERE eventtime >= '${fiveSecondsAgo}'
  `;

  db.query(query, (err, results) => {
    // Marcamos que la consulta terminó
    isQueryInProgress = false;

    if (err) {
      //console.error("Query error:", err);
      callback(err, null);
    } else {
      //console.log(query, results);
      callback(null, results);
    }
  });
};

const createEventSos = (deviceId, callback) => {
  const queryposition = `SELECT positionid, name FROM tc_devices WHERE id = ? LIMIT 1`;

  db.query(queryposition, [deviceId], (err, results) => {
    if (err) {
      return callback(err, null);
    }

    if (results.length === 0) {
      return callback("Device not found", null);
    }

    const { positionid: positionId, name: vehicleName } = results[0];
    const query = `INSERT INTO tc_events (type, eventtime, deviceid, positionid) VALUES ('sos', NOW(), ?, ?)`;

    db.query(query, [deviceId, positionId], (err, insertResults) => {
      if (err) {
        return callback(err, null);
      }

      const data = {
        sound: "sirena.wav", // Nombre del archivo de sonido personalizado
        title: "¡ALERTA DE SOS!",
        body: `Se ha activado una alerta de SOS en su vehículo: ${vehicleName}`,
        data: {
          vehicleId: deviceId,
          screen: "Maps",
        },
        channelId: "sos-channel", // Canal personalizado
        android: {
          channelId: "sos-channel",
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#FF231F7C",
        },
        ios: {
          sound: "sirena.wav", // Nombre del archivo de sonido personalizado para iOS
        },
      };
      sendNotifications(deviceId, data, (err, notificationResult) => {
        if (err) {
          return callback(err, null);
        }
        callback(null, insertResults);
      });
    });
  });
};

const enviarNotificacion = (alertas) => {
  // Filter out already sent alerts
  const newAlerts = alertas.filter((alert) => !sentAlertIds.includes(alert.id));

  let data = {};
  for (const alert of newAlerts) {
    console.log([
      //new Date().toISOString().slice(0, 19).replace("T", " "),
      alert.id,
      alert.type,
      //alert.eventtime,
    ]);
    switch (alert.type) {
      case "alarm":
        data = {
          sound: "alarmanoti.wav", // Nombre del archivo de sonido personalizado
          title: "¡Alerta!",
          body: `Movimiento inusual en su vehiculo ${alert.name}`,
          data: {
            vehicleId: alert.deviceid,
            screen: "Maps",
          },
          channelId: "alarm-channel", // Canal personalizado
          android: {
            channelId: "alarm-channel",
            vibrationPattern: [0, 250, 250, 250],
            lightColor: "#FF231F7C",
          },
          ios: {
            sound: "alarmanoti.wav", // Nombre del archivo de sonido personalizado para iOS
          },
        };
        break;
      case "ignitionOn":
        data = {
          title: "¡Alerta!",
          body: `Encendido del vehiculo ${alert.name}`,
          data: {
            vehicleId: alert.deviceid,
            screen: "Maps",
          },
          android: {
            vibrationPattern: [0, 250, 250, 250],
          },
        };
        break;
      default:
        data = null;
        break;
    }
    if (data) {
      sendNotifications(alert.deviceid, data, (err, result) => {});
    }
  }

  // Update sent alert IDs
  sentAlertIds = [
    ...new Set([...sentAlertIds, ...newAlerts.map((alert) => alert.id)]),
  ];

  // Keep only the last 'maxIterations' sets of alert IDs
  if (sentAlertIds.length > maxIterations * alertas.length) {
    sentAlertIds = sentAlertIds.slice(-maxIterations * alertas.length);
  }
};

module.exports = {
  getAlerts,
  createEventSos,
  enviarNotificacion,
};
