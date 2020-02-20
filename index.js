require('dotenv').config();
const logger = require("./logger")(module)
const connect = require("./mongodb/connect");
const pupeteer = require('puppeteer');
const cheerio = require('cheerio');
const { SFRCSchema } = require("./mongodb/schemas");
const asyncForEach = async (array, callback) => {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index]);
  }
};

let range = Array(66)
  .fill(1)
  .map((x, y) => x + y);

const getHearings = async (url, page) => {
  await page.goto(url, {waitUntil: 'networkidle2'}); // Ensure no network requests are happening (in last 500ms).
  let html = await page.content();
  let cleaned = html.replace(/[\t\n]+/g,' ');
  
  //// Cheerio...
  let $ = cheerio.load(cleaned);
  let res = [];
  let $rows = $('tr.vevent')
    .map((i, v) => $(v).find('td'));
  $rows.each((i, v) => {
    let linkBase = 'https://www.foreign.senate.gov';
    let linkRef = $(v[0])
      .find('a')
      .attr('href');
    let link = linkBase.concat(linkRef);
    let title = $(v[0])
      .find('a')
      .first()
      .text()
      .replace(/\s\s+/g, " ")
      .trim();
    let location = $(v[1])
      .text()
      .trim();
    let timeData = $(v[2])
      .text()
      .trim()
      .split(' ');
    let date = timeData[0];
    let time = timeData[1];
    res.push({link, title, location, time, date});
  });

  return res;
};

let execute = async () => {
  connect(); 

  const browser = await pupeteer.launch({headless: true});
  const page = await browser.newPage();
  
  await asyncForEach(range, async(pageNum) => {
    let hearings = await getHearings(`https://www.foreign.senate.gov/hearings?PageNum_rs=${pageNum}`, page);
    await SFRCSchema.insertMany(hearings);
    logger.info(`Added ${hearings.length} new records.`);
  });

  await browser.close();
  logger.info('Done');
};

execute();
