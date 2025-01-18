require("dotenv").config();
const mysql = require("mysql2");

const db = mysql.createConnection({
  host: process.env.DB1_HOST,
  user: process.env.DB1_USER,
  password: process.env.DB1_PASSWORD,
  database: process.env.DB1_DATABASE,
});

db.connect((err) => {
  if (err) {
    console.error("Error connecting to the database:", err);
    return;
  }
  console.log("Connected to the database");
});

const db2 = mysql.createConnection({
  host: process.env.DB2_HOST,
  user: process.env.DB2_USER,
  password: process.env.DB2_PASSWORD,
  database: process.env.DB2_DATABASE,
});

db2.connect((err) => {
  if (err) {
    console.error("Error connecting to the database 2:", err);
    return;
  }
  console.log("Connected to the database 2");
});

module.exports = { db, db2 };
