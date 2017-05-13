{
  const sensor = require('index.js');
  let temperature = 0, humidity = 0;

  sensor.init();

  console.log(sensor.getHumidity());
  console.log(sensor.getTemperature());

}
