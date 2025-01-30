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

  const secondsToSubtract = (2 * timeStep) / 1000;
  const now = new Date();
  now.setSeconds(now.getSeconds() - secondsToSubtract);
  const fiveSecondsAgo = now.toISOString().slice(0, 19).replace("T", " ");

  const query = `
    SELECT te.*, tp.latitude, tp.longitude 
    FROM tc_events te 
    JOIN tc_positions tp ON te.positionid = tp.id 
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
  const queryposition = `SELECT positionid, name FROM tc_devices WHERE id = ${deviceId} LIMIT 1`;
  db.query(queryposition, (err, results) => {
    if (err) {
      //console.error("Query error:", err);
      callback(err, null);
    } else {
      //console.log(queryposition, results);
      if (results.length === 0) {
        callback("Device not found", null);
      } else {
        const positionId = results[0].positionid;
        const vehicleName = results[0].name;
        const query = `INSERT INTO tc_events (type, eventtime, deviceid, positionid) VALUES ('sos', NOW(), ${deviceId}, ${positionId})`;
        db.query(query, (err, results) => {
          if (err) {
            //console.error("Query error:", err);
            callback(err, null);
          } else {
            //console.log(query, results);
            try {
              sendNotifications(
                deviceId,
                "¡ALERTA DE SOS!",
                "Se ha activado una alerta de SOS en su vehiculo: " + vehicleName,
                (err, result) => {
                  if (err) {
                    callback(err, null);
                  } else {
                    callback(null, results);
                  }
                }
              );
            } catch (error) {
              callback(null, results);
            }
          }
        });
      }
    }
  });
};

module.exports = {
  getAlerts,
  createEventSos,
};
