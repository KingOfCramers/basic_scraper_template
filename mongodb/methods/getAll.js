const logger = require('../../logger')(module);

module.exports = async (Model) => {
  try {
    const allData = await Model.find({}).lean();
    return allData;
  } catch (err) {
    logger.error(`MongoDB/Mongoose Error`);
    throw err;
  }
};
