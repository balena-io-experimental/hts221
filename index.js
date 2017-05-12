const i2c = require('i2c-bus');

const HTS221_ADDRESS_W = 0x5E;
const HTS221_ADDRESS_R = 0x5F;
const HTS221_ID = 0xBC;
const HTS221_WHO_AM_I = 0x0F;
const HTS221_AV_CONF = 0x10;
const HTS221_CTRL1 = 0x20;
const HTS221_CTRL2 = 0x21;
const HTS221_CTRL3 = 0x22;
const HTS221_STATUS = 0x27;
const HTS221_HUMIDITY_OUT_L = 0x28;
const HTS221_HUMIDITY_OUT_H = 0x29;
const HTS221_TEMP_OUT_L = 0x2A;
const HTS221_TEMP_OUT_H = 0x2B;
const HTS221_H0_H_2 = 0x30;
const HTS221_H1_H_2 = 0x31;
const HTS221_T0_C_8 = 0x32;
const HTS221_T1_C_8 = 0x33;
const HTS221_T1_T0 = 0x35;
const HTS221_H0_T0_OUT = 0x36;
const HTS221_H1_T0_OUT = 0x3A;
const HTS221_T0_OUT = 0x3C;
const HTS221_T1_OUT = 0x3E;

let T1_T0 = 0,
  T0_C_8 = 0,
  T0 = 0,
  T1_C_8 = 0,
  T1 = 0,
  T0_OUT = 0,
  T1_OUT = 0;
let H0_H_2 = 0,
  H1_H_2 = 0,
  H0 = 0,
  H1 = 0,
  H0_T0_OUT = 0,
  H1_T0_OUT = 0;

let temperature_m = 0,
  temperature_c = 0,
  humidity_m = 0,
  humidity_c = 0;

let initialized = false;

function init() {
  'use strict';
  initialized = false;

  const i2c1 = i2c.openSync(1);

  // Calibrate it.
  i2c1.writeByteSync(HTS221_ADDRESS_R, HTS221_CTRL1, 0x87);
  i2c1.writeByteSync(HTS221_ADDRESS_R, HTS221_AV_CONF, 0x1B);

  // Get Calibration Data
  T1_T0 = i2c1.readByteSync(HTS221_ADDRESS_R, HTS221_T1_T0);
  T0_C_8 = ((T1_T0 & 0x03) * 256) | i2c1.readByteSync(HTS221_ADDRESS_R, HTS221_T0_C_8);
  T0 = T0_C_8 / 8;

  T1_C_8 = ((T1_T0 & 0x0C) * 64) | i2c1.readByteSync(HTS221_ADDRESS_R, HTS221_T1_C_8);
  T1 = T1_C_8 / 8;

  T0_OUT = (i2c1.readByteSync(HTS221_ADDRESS_R, HTS221_T0_OUT + 1) * 256) | i2c1.readByteSync(HTS221_ADDRESS_R, HTS221_T0_OUT);
  T1_OUT = (i2c1.readByteSync(HTS221_ADDRESS_R, HTS221_T1_OUT + 1) * 256) | i2c1.readByteSync(HTS221_ADDRESS_R, HTS221_T1_OUT);

  H0_H_2 = i2c1.readByteSync(HTS221_ADDRESS_R, HTS221_H0_H_2);
  H0 = H0_H_2 / 2;
  H1_H_2 = i2c1.readByteSync(HTS221_ADDRESS_R, HTS221_H1_H_2);
  H1 = H1_H_2 / 2;

  H0_T0_OUT = (i2c1.readByteSync(HTS221_ADDRESS_R, HTS221_H0_T0_OUT + 1) * 256) | i2c1.readByteSync(HTS221_ADDRESS_R, HTS221_H0_T0_OUT);
  H1_T0_OUT = (i2c1.readByteSync(HTS221_ADDRESS_R, HTS221_H1_T0_OUT + 1) * 256) | i2c1.readByteSync(HTS221_ADDRESS_R, HTS221_H1_T0_OUT);

  temperature_m = (T1 - T0) / (T1_OUT - T0_OUT);
  temperature_c = T0 - (temperature_m * T0_OUT);
  humidity_m = (H1 - H0) / (H1_T0_OUT - H0_T0_OUT);
  humidity_c = H0 - (humidity_m * H0_T0_OUT);

  i2c1.closeSync();

  initialized = true;
}

let data = {
  humidityValid: false,
  temperatureValid: false,
  temperature: 0,
  humidity: 0
};

function humidityRead() {
  'use strict';

  if (!initialized) init();

  data.humidityValid = false;
  data.temperatureValid = false;
  data.humidity = 0;
  data.temperature = 0;

  var i2c1 = i2c.openSync(1);

  var status = i2c1.readByteSync(HTS221_ADDRESS_R, HTS221_STATUS);

  if (status & 2) {
    data.humidity = (i2c1.readByteSync(HTS221_ADDRESS_R, HTS221_HUMIDITY_OUT_H) * 256) | i2c1.readByteSync(HTS221_ADDRESS_R, HTS221_HUMIDITY_OUT_L);
    data.humidity = (data.humidity * humidity_m) + humidity_c;
    data.humidityValid = true;
  }

  if (status & 1) {
    data.temperature = (i2c1.readByteSync(HTS221_ADDRESS_R, HTS221_TEMP_OUT_H) * 256) | i2c1.readByteSync(HTS221_ADDRESS_R, HTS221_TEMP_OUT_L);
    data.temperature = (data.temperature * temperature_m) + temperature_c;
    data.temperatureValid = true;
  }

  i2c1.closeSync();

  return data;
}

module.exports.get = humidityRead;

var HTS221_ADDR = 0x5F;

var CMD_HUMID_HIGH = 0x29;
var CMD_HUMID_LOW = 0x28;

var CMD_T_OUT_L = 0x2A;
var CMD_T_OUT_H = 0x2B;

var CMD_T0_DEGC_X8 = 0x32;
var CMD_T1_DEGC_X8 = 0x33;

var CMD_T0_T1_DEGC_H2 = 0x35;

var CMD_T0_OUT_L = 0x3C;
var CMD_T0_OUT_H = 0x3D;
var CMD_T1_OUT_L = 0x3E;
var CMD_T1_OUT_H = 0x3F;

function getTemperatureFromHumidity() {
  'use strict';

  var T0_out, T1_out, T_out, T0_degC_x8_u16, T1_degC_x8_u16, T0_degC, T1_degC;
  var H_out;

  var i2c1 = i2c.openSync(1);

  i2c1.writeByteSync(HTS221_ADDR, 0x20, 0x87);
  i2c1.writeByteSync(HTS221_ADDR, 0x10, 0x1B);

  var T0_degC_x8 = i2c1.readByteSync(HTS221_ADDR, CMD_T0_DEGC_X8);
  var T1_degC_x8 = i2c1.readByteSync(HTS221_ADDR, CMD_T1_DEGC_X8);
  var T0_T1_DEGC_H2 = i2c1.readByteSync(HTS221_ADDR, CMD_T0_T1_DEGC_H2);

  T0_degC_x8_u16 = ((T0_T1_DEGC_H2 & 0x03) * 256) | T0_degC_x8;
  T1_degC_x8_u16 = ((T0_T1_DEGC_H2 & 0x0C) * 64) | T1_degC_x8;

  T0_degC = T0_degC_x8_u16 / 8;
  T1_degC = T1_degC_x8_u16 / 8;

  T0_out = (i2c1.readByteSync(HTS221_ADDR, CMD_T0_OUT_H) * 256) | i2c1.readByteSync(HTS221_ADDR, CMD_T0_OUT_L);
  T1_out = (i2c1.readByteSync(HTS221_ADDR, CMD_T1_OUT_H) * 256) | i2c1.readByteSync(HTS221_ADDR, CMD_T1_OUT_L);

  H_out = (i2c1.readByteSync(HTS221_ADDR, CMD_HUMID_HIGH) * 256) | i2c1.readByteSync(HTS221_ADDR, CMD_HUMID_LOW);
  T_out = (i2c1.readByteSync(HTS221_ADDR, CMD_T_OUT_H) * 256) | i2c1.readByteSync(HTS221_ADDR, CMD_T_OUT_L);

  i2c1.closeSync();

  var T0 = T0_degC;
  var T1 = T1_degC;
  var temperature_m = (T1 - T0) / (T1_out - T0_out);
  var temperature_c = T0 - (temperature_m * T0_out);

  var temperature = (T_out * temperature_m) + temperature_c;

  var part1 = T_out - T0_out;
  var part2 = T1_degC - T0_degC;
  if (part1 < 0) part1 = 65536 + part1;
  if (part2 < 0) part2 = 65536 + part2;

  var result = ((part1 * part2 * 10) / (T1_out - T0_out)) + (T0_degC * 10);

  return result;

}
