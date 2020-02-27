require('dotenv').config({ path: "../.env" });
const connect = require("../mongodb/connect");
const { SASCSchema } = require("../mongodb/schemas");
const find = require("../mongodb/methods/find");
const fs = require("fs");

(async function(){
  let db = await connect();
  let dates = [];
  let hearings = fs.readFileSync("../afghanistanHearings.js");
  let hearingData = JSON.parse(hearings);
  let promises = hearingData.map(id => new Promise(async(resolve, reject) => {
    let query = { _id: id };
    let data = await find(SASCSchema, query);
    dates.push(data[0].date);
    return resolve();
  }));

  await Promise.all(promises);
  await db.disconnect();
  let csv = dates.join(",\n")
  fs.writeFile('China.csv', csv, (err, res) => {
    if (err) console.log("There was an error writing the file.", err);
  })
  
})();
