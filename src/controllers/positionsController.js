const db = require("../config/db");

const getPositions = (callback) => {
  const query = `SELECT tp.* FROM tc_devices tc LEFT JOIN tc_positions tp ON tc.positionid = tp.id`;

  db.query(query, (err, results) => {
    if (err) {
      callback(err, null);
    } else {
      callback(null, results);
    }
  });
};

module.exports = { getPositions };
