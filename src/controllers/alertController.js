const { db } = require("../config/db");
const { sendNotifications } = require("./notificacionController");

// Variable global para controlar si hay una consulta en proceso
let isQueryInProgress = false;

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
    SELECT te.*, tp.latitude, tp.longitude 
    FROM tc_events te 
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

      sendNotifications(
        deviceId,
        "¡ALERTA DE SOS!",
        `Se ha activado una alerta de SOS en su vehículo: ${vehicleName}`,
        (err, notificationResult) => {
          if (err) {
            return callback(err, null);
          }
          callback(null, insertResults);
        }
      );
    });
  });
};

module.exports = {
  getAlerts,
  createEventSos,
};
