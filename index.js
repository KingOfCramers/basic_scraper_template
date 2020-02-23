require('dotenv').config();
const events = require('events');
const logger = require('./logger')(module);
const connect = require('./mongodb/connect');
const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const rp = require('request-promise');
const {SFRCSchema, SASCSchema} = require('./mongodb/schemas');
const getAll = require('./mongodb/methods/getAll');
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
  let cleaned = html.replace(/[\t\n]+/g, ' ');

  //// Cheerio...
  let $ = cheerio.load(cleaned);
  let res = [];
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
    res.push({link, title, location, time, date});
  });

  return res;
};

let execute = async () => {
  connect();

  const browser = await puppeteer.launch({headless: true});
  const page = await browser.newPage();

  await asyncForEach(range, async pageNum => {
    let hearings = await getHearings(
      `https://www.foreign.senate.gov/hearings?PageNum_rs=${pageNum}`,
      page,
    );
    await SFRCSchema.insertMany(hearings);
    logger.info(`Added ${hearings.length} new records.`);
  });

  await browser.close();
  logger.info('Done');
};

// execute();

let getTestimony = async () => {
  const db = await connect();
  const browser = await puppeteer.launch({headless: true});
  const page = await browser.newPage();

  const data = await getAll(SASCSchema);
  logger.info('Fetched SASC Links...');

  const ee = new events.EventEmitter();
  ee.on('getDownloadLink', async data => {
    let {links, type, homeLink, id} = data;
    let page = await browser.newPage();

    page.waitForSelector('div.row a').then(async _ => {
      let downloadLink = await page.$$eval('div.row a', x =>
        x.map(a => a.href),
      );

      if (!fs.existsSync(path.resolve(__dirname, 'pdfs', id))) {
        fs.mkdirSync(path.resolve(__dirname, 'pdfs', id));
      }
      ee.emit('getPDF', {link: downloadLink[0], type, id});
    });

    for (let [i, link] of links.entries()) {
      logger.info(
        `Getting ${type} #${i + 1} of ${links.length} for ${homeLink}`,
      );
      await page.goto(link);
    }

    await page.close();
  });

  ee.on('getPDF', async ({link, type, id}) => {
    const options = {
      uri: link,
      method: 'GET',
      encoding: 'binary',
      headers: {
        'Content-type': 'applcation/pdf',
      },
    };
    let res = await rp(options);
    let linkObject = new URL(link);
    let fileName = linkObject.toString().split("id=")[1].split("&download")[0]; 
    let writeStream = fs.createWriteStream(
      path.resolve(__dirname, 'pdfs', id, fileName, ".pdf"),
    );
    writeStream.write(res, 'binary');
    writeStream.on('finish', () => {
      logger.info(`Downloaded ${type}.`);
    });
    writeStream.end();
  });

  await asyncForEach(data, async datum => {
    const {link, _id} = datum;
    await page.goto(link, {waitUntil: 'networkidle2'}); // Ensure no network requests are happening (in last 500ms).
    let html = await page.content();
    let cleaned = html.replace(/[\t\n]+/g, ' ');
    let $ = cheerio.load(cleaned);
    let hearingTestimony = $('a.hearing-pdf')
      .toArray()
      .map(v => $(v).attr('href'));
    let hearingTranscript = $("a[style='text-transform: capitalize;']")
      .toArray()
      .map(v => $(v).attr('href'));
    if (hearingTestimony.length) {
      ee.emit('getDownloadLink', {
        links: hearingTestimony,
        type: 'testimony',
        homeLink: link,
        id: _id.toString(),
      });
    }
    if (hearingTranscript.length) {
      ee.emit('getDownloadLink', {
        links: hearingTranscript,
        type: 'transcript',
        homeLink: link,
        id: _id.toString(),
      });
    }
  });

  await page.close();
  await browser.close();
  await db.disconnect();

  logger.info('Connection closed, function complete.');
};

getTestimony();
