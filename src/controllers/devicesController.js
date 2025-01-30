function detectVehicleChanges(beforeDevices, currentDevices) {
  const getDeviceIds = (deviceArray) => deviceArray.map((device) => device.id);

  const beforeDeviceIds = getDeviceIds(beforeDevices);
  const currentDeviceIds = getDeviceIds(currentDevices);

  const addedDevices = currentDevices.filter(
    (device) => !beforeDeviceIds.includes(device.id)
  );
  const removedDevices = beforeDevices.filter(
    (device) => !currentDeviceIds.includes(device.id)
  );

  const events = [];

  if (addedDevices.length > 0) {
    events.push({
      event: "new_vehicle",
      data: addedDevices,
    });
  }

  if (removedDevices.length > 0) {
    events.push({
      event: "removed_vehicle",
      data: removedDevices,
    });
  }

  return events;
}

module.exports = {
  detectVehicleChanges,
};