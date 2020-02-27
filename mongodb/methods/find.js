const logger = require('../../logger')(module);

module.exports = async (Model, query) => {
  try {
    const allData = await Model.find(query).lean();
    return allData;
  } catch (err) {
    logger.error(`MongoDB/Mongoose Error`);
    throw err;
  }
};
