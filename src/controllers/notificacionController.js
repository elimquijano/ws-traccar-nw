require("dotenv").config();
const axios = require("axios");
const { db } = require("../config/db");

const fetchPushTokenUser = (traccar_id, callback) => {
  let config = {
    method: "get",
    maxBodyLength: Infinity,
    url:
      process.env.BASE_URL_ADMIN_API + `pushtokenuser?traccar_id=${traccar_id}`,
    headers: {},
  };

  axios
    .request(config)
    .then((response) => {
      return callback(null, response.data);
    })
    .catch((error) => {
      console.error("Request error:", error);
      return callback(error, []);
    });
};

const sendPushNotifications = (traccar_id, titulo, mensaje, callback) => {
  fetchPushTokenUser(traccar_id, (err, users) => {
    if (err) {
      return callback(err);
    }

    users.forEach((user) => {
      const data = JSON.stringify({
        to: user.token,
        sound: "default",
        title: titulo,
        body: mensaje,
        data: {
          someData: "goes here",
        },
      });

      const config = {
        method: "post",
        maxBodyLength: Infinity,
        url: "https://exp.host/--/api/v2/push/send",
        headers: {
          "Content-Type": "application/json",
        },
        data: data,
      };

      axios
        .request(config)
        .then((response) => {
          return response.data;
        })
        .catch((error) => {
          console.error("Push notification error:", error);
        });
    });

    return callback(null);
  });
};

const sendSms = (traccar_id, titulo, mensaje, callback) => {
  // Configuración de la solicitud GET para obtener los datos del usuario
  const configGet = {
    method: "get",
    maxBodyLength: Infinity,
    url: `${process.env.BASE_URL_TRACCAR}users/${traccar_id}`,
    headers: {
      Authorization: `Basic ${process.env.TRACCAR_API_TOKEN}`,
      "Content-Type": "application/json",
    },
  };

  // Realizar la solicitud GET para obtener los datos del usuario
  axios
    .request(configGet)
    .then((response) => {
      const phone = response.data.phone;

      // Preparar los datos del SMS tal como funcionan en Postman
      const smsData = {
        token: process.env.TOKEN_API_SMS, // Asegúrate de que este valor es correcto o usa process.env.TOKEN_API_SMS si está definido
        tipe: "sms", // Mantener "tipe" como en Postman
        number_s: phone,
        body: `${titulo}, ${mensaje}`,
      };

      // Configuración de la solicitud POST para enviar el SMS
      const configPost = {
        method: "post",
        maxBodyLength: Infinity,
        url: process.env.BASE_URL_SMS, // Asegúrate de que esta URL es correcta
        headers: {
          "Content-Type": "application/json",
        },
        data: JSON.stringify(smsData),
      };

      // Realizar la solicitud POST para enviar el SMS
      return axios.request(configPost);
    })
    .then((response) => {
      callback(null, response.data);
    })
    .catch((error) => {
      if (error.response) {
        console.error("Error de la API de SMS:", error.response.data);
      } else {
        console.error("Error al enviar SMS:", error.message);
      }
      callback(error);
    });
};

const fetchUsersOfDevice = (deviceid, callback) => {
  const query = `SELECT * FROM tc_user_device WHERE deviceid=${deviceid}`;
  db.query(query, (err, results) => {
    if (err) {
      console.error("Query error:", err);
      callback(err, null);
    } else {
      callback(null, results);
    }
  });
};

const sendNotifications = async (deviceid, titulo, mensaje, callback) => {
  try {
    const users = await new Promise((resolve, reject) => {
      fetchUsersOfDevice(deviceid, (err, results) => {
        if (err) return reject(err);
        resolve(results);
      });
    });

    if (!users || users.length === 0) {
      return callback({ message: "No users found for the device." }, null);
    }

    const results = await Promise.all(
      users.map(async (user) => {
        const traccar_id = user.userid;
        try {
          await Promise.all([
            new Promise((res, rej) => {
              sendPushNotifications(traccar_id, titulo, mensaje, (err) => {
                if (err) rej(err);
                else res();
              });
            }),
            new Promise((res, rej) => {
              sendSms(traccar_id, titulo, mensaje, (err) => {
                if (err) rej(err);
                else res();
              });
            }),
          ]);
          return { user: traccar_id, status: "success" };
        } catch {
          return { user: traccar_id, status: "failed" };
        }
      })
    );

    const hasSuccess = results.some((result) => result.status === "success");

    if (hasSuccess) {
      callback(null, { message: "Notifications sent successfully.", details: results });
    } else {
      callback({ message: "Failed to send notifications to all users.", details: results }, null);
    }
  } catch (error) {
    callback({ message: "Error fetching users.", error }, null);
  }
};

module.exports = { sendNotifications };
