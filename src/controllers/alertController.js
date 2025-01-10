const db = require("../config/db");
const moment = require("moment");

const getAlerts = (timeStep, callback) => {
  const timeSpace = timeStep / 1000;
  // Get current time and 5 seconds ago in MySQL datetime format, adding 5 hours
  const fiveSecondsAgo = moment()
    .add(5, "hours")
    .subtract(timeSpace, "seconds")
    .format("YYYY-MM-DD HH:mm:ss");

  const query = `SELECT te.*, tp.latitude, tp.longitude FROM tc_events te JOIN tc_positions tp ON te.positionid = tp.id WHERE eventtime >= '${fiveSecondsAgo}'`;

  db.query(query, (err, results) => {
    if (err) {
      callback(err, null);
    } else {
      callback(null, results);
    }
  });
};

module.exports = { getAlerts };
