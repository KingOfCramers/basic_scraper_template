const puppeteer = require("puppeteer");
const cheerio = require("cheerio");
const logger = require("../logger")(module)
const { asyncForEach } = require("../util");
const insertMany = require("../mongodb/methods/insertMany");
const connect = require("../mongodb/connect");

const sfrcLogic = ($) => {
  let data = [];
  let $rows = $('tr.vevent').map((i, v) => $(v).find('td'));
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
      .replace(/\s\s+/g, ' ')
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
    data.push({link, title, location, time, date});
  });
  return data;
};

const getHearings = async (url, page, schemaName) => {
  await page.goto(url, { waitUntil: 'networkidle2' });
  let html = await page.content();
  let cleaned = html.replace(/[\t\n]+/g, ' ');
  let $ = cheerio.load(cleaned);

  let logic = ((name) => {
    switch (name) {
      case 'SFRC':
        return sfrcLogic;
      case 'SASC':
        return sascLogic;
    }
  })(schemaName);
  
  let res = logic($);
  debugger;
  return res;
};

let runCrawler = async (numberOfPagesToCrawl, baseLink, targetSchema) => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  const db = await connect();

  await asyncForEach(numberOfPagesToCrawl, async pageNum => {
    let linkTarget = baseLink.replace("XXXX", pageNum)
    let hearings = await getHearings(linkTarget, page, targetSchema.modelName);
    await insertMany(hearings, targetSchema);
    logger.info(`Added ${hearings.length} new records to ${targetSchema.modelName}.`);
  });

  await browser.close();
  await db.disconnect();
  logger.info('Done');
};

module.exports = runCrawler;