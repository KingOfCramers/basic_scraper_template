const events = require("events");

const ee = new events.EventEmitter();

ee.on('FirstEvent', (data) => {

  console.log(data);

});

ee.emit('FirstEvent', 'This is my first Node.js event eeitter example.');
