const { db2 } = require("../config/db");

const getDetails = (callback) => {
  const query = 
    "SELECT td.deviceid as id, i.url FROM tc_details td JOIN iconos i ON td.id_icono=i.id";
    
  db2.query(query, (err, results) => {
    if (err) {
      console.error("Query error:", err);
      return callback(err, []);
    }
    return callback(null, results);
  });
};

module.exports = { getDetails };