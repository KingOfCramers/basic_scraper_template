const winston = require('winston');
const { format, transports } = require('winston')
const path = require('path');
const moment = require('moment');

// Return the last folder name in the path and the calling
// module's filename.
const getLabel = function(callingModule) {
  const parts = callingModule.filename.split(path.sep);
  return path.join(parts[parts.length - 2], parts.pop());
};

module.exports = (callingModule) => winston.createLogger({
  transports: [
    new transports.Console({
      level: 'info',
      format: format.combine(
        format.timestamp(),
        format.colorize(),
        format.errors({ stack: true }),
        format.printf(info => {
          const message = info[Symbol.for('splat')]
            ? info.message + ' - ' + info[Symbol.for('splat')][0]
            : info.message;
          return `[${moment(info.timestamp).format('lll')}][${getLabel(callingModule)}][${info.level}]: ${message}`;
        }),
      ),
    }),
  ],
});
