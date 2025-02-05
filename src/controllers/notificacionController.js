require("dotenv").config();
const axios = require("axios");
const { db } = require("../config/db");

const sendPushNotification = async (expoPushToken, title, body, vehicleId) => {
  const message = {
    to: expoPushToken,
    sound: "alarmanoti.wav", // Nombre del archivo de sonido personalizado
    title: title,
    body: body,
    data: {
      vehicleId: vehicleId,
      screen: "Maps",
    },
    channelId: "custom-channel", // Canal personalizado
    android: {
      channelId: "custom-channel",
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
    },
    ios: {
      sound: "alarmanoti.wav", // Nombre del archivo de sonido personalizado para iOS
    },
  };

  const response = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Accept-encoding": "gzip, deflate",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(message),
  });

  const data = await response.json();
  console.log(data?.data);
};

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

const sendPushNotifications = async (
  traccar_id,
  deviceid,
  titulo,
  mensaje,
  callback
) => {
  try {
    const users = await new Promise((resolve, reject) => {
      fetchPushTokenUser(traccar_id, (err, users) => {
        if (err) return reject(err);
        resolve(users);
      });
    });

    if (!users || users.length === 0) {
      return callback(null, {
        message: "No users found for push notifications.",
      });
    }

    const notificationPromises = users.map((user) => {
      return new Promise(async (resolve, reject) => {
        try {
          await sendPushNotification(user.token, titulo, mensaje, deviceid);
          resolve();
        } catch (error) {
          reject(error);
        }
      });
    });

    await Promise.all(notificationPromises);

    callback(null, { message: "Push notifications sent successfully." });
  } catch (error) {
    callback({
      message: "Error sending push notifications.",
      error: error.message,
    });
  }
};

const sendSms = async (traccar_id, titulo, mensaje, callback) => {
  const configGet = {
    method: "get",
    maxBodyLength: Infinity,
    url: `${process.env.BASE_URL_TRACCAR}users/${traccar_id}`,
    headers: {
      Authorization: `Basic ${process.env.TRACCAR_API_TOKEN}`,
      "Content-Type": "application/json",
    },
    timeout: 10000, // Establecer un timeout de 10 segundos
  };

  try {
    const response = await axios.request(configGet);
    const phone = response.data.phone;

    if (!phone || phone.length !== 9) {
      console.warn(
        `El número de teléfono para el usuario ${traccar_id} no es válido.`
      );
      return callback(null, { message: "Número de teléfono no válido." });
    }

    const smsData = {
      token: process.env.TOKEN_API_SMS,
      tipe: "sms",
      number_s: phone,
      body: `${titulo}, ${mensaje}`,
    };

    const configPost = {
      method: "post",
      maxBodyLength: Infinity,
      url: process.env.BASE_URL_SMS,
      headers: {
        "Content-Type": "application/json",
      },
      data: JSON.stringify(smsData),
      timeout: 10000, // Establecer un timeout de 10 segundos
    };

    const smsResponse = await axios.request(configPost);
    callback(null, smsResponse.data);
  } catch (error) {
    if (error.response) {
      console.error("Error de la API de SMS:", error.response.data);
    } else {
      console.error("Error al enviar SMS:", error.message);
    }
    callback(error);
  }
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

    const notificationPromises = users.map(async (user) => {
      const traccar_id = user.userid;
      try {
        await Promise.all([
          new Promise((res, rej) => {
            sendPushNotifications(
              traccar_id,
              deviceid,
              titulo,
              mensaje,
              (err) => {
                if (err) rej(err);
                else res();
              }
            );
          }),
          /* new Promise((res, rej) => {
            sendSms(traccar_id, titulo, mensaje, (err) => {
              if (err) rej(err);
              else res();
            });
          }), */
        ]);
        return { user: traccar_id, status: "success" };
      } catch (error) {
        return { user: traccar_id, status: "failed", error: error.message };
      }
    });

    const results = await Promise.all(notificationPromises);

    const hasSuccess = results.some((result) => result.status === "success");

    if (hasSuccess) {
      callback(null, {
        message: "Notifications sent successfully.",
        details: results,
      });
    } else {
      callback(
        {
          message: "Failed to send notifications to all users.",
          details: results,
        },
        null
      );
    }
  } catch (error) {
    callback({ message: "Error fetching users.", error: error.message }, null);
  }
};

module.exports = { sendNotifications };
