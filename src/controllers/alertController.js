const { db } = require("../config/db");
const moment = require("moment");

// Variable global para controlar si hay una consulta en proceso
let isQueryInProgress = false;

const getAlerts = (timeStep, callback) => {
  // Si hay una consulta en proceso, cancelamos esta
  if (isQueryInProgress) {
    return;
  }

  isQueryInProgress = true;

  const fiveSecondsAgo = moment()
    .add(5, "hours")
    .subtract((2 * timeStep) / 1000, "seconds")
    .format("YYYY-MM-DD HH:mm:ss");

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

module.exports = {
  getAlerts,
};
