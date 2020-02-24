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

  const browser = await puppeteer.launch({headless: false});
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



const ee = new events.EventEmitter();
ee.on('getPDFs', async ({ data, type, id }) => {
  
  if (!fs.existsSync(path.resolve(__dirname, 'pdfs', id))) {
    fs.mkdirSync(path.resolve(__dirname, 'pdfs', id));
  }

  if (!fs.existsSync(path.resolve(__dirname, 'pdfs', id, type))) {
    fs.mkdirSync(path.resolve(__dirname, 'pdfs', id, type));
  }

  let promises = data.map(({ fileName, link }) => new Promise(async(resolve, reject) => {

    const options = {
      uri: link,
      method: 'GET',
      encoding: 'binary',
      headers: {
        'Content-type': 'applcation/pdf',
      },
    };

    let res = await rp(options);
    fileName = fileName.endsWith('.pdf') ? fileName : fileName.concat(".pdf");
    let writeStream = fs.createWriteStream(path.resolve(__dirname, 'pdfs', id, type, fileName));
    writeStream.write(res, 'binary');
    writeStream.end();
    writeStream.on('error', (err) => {
      logger.error(`Could not write ${type} for ${id}`, err);
      reject();
    });
    writeStream.on('close', () => {
      logger.info(`Finished writing ${type}: ${fileName}`);
      resolve();
    });
  }));

  await Promise.all(promises);
  logger.info(`Finished writing all ${type}(s) for ${id}`);

});

let getTestimony = async () => {
  const db = await connect();
  const browser = await puppeteer.launch({headless: false});
  const page = await browser.newPage();

  let data = await getAll(SASCSchema);
  logger.info('Fetched SASC Links...');

  // For every page....
  await asyncForEach([data[151], data[149], data[130]], async datum => {
    const {link, _id, date } = datum;
    await page.goto(link, {waitUntil: 'networkidle2'});
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
      let promises = hearingTestimony.map(_ => browser.newPage());
      let pages = await Promise.all(promises);
      let promisesTwo = pages.map(async(v,i) => {
        logger.info(`[${date}] > testimony #${i + 1} of ${hearingTestimony.length} for ${link}`);
        await v.goto(hearingTestimony[i], {waitUntil: 'networkidle2'});
        await v.waitFor(5000);
        let l = v.url();
        let linkObject = new URL(l);
        let fileName = linkObject.pathname.split("/")[linkObject.pathname.split("/").length - 1].replace(/%20/g, "_");
        return { fileName, link: linkObject.href, page: v }
      });
      
      let data = await Promise.all(promisesTwo);
      await Promise.all(data.map(({ page }) => page.close()));
      ee.emit('getPDFs', { data, id: _id.toString(), type: 'testimony' });
    }

    if (hearingTranscript.length) {
      let promises = hearingTranscript.map(_ => browser.newPage());
      let pages = await Promise.all(promises);
      let promisesTwo = pages.map(async(v,i) => {
        logger.info(`[${date}] > transcript #${i + 1} of ${hearingTranscript.length} for ${link}`);
        await v.goto(hearingTranscript[i], {waitUntil: 'networkidle2'});
        await v.waitFor(5000);
        let l = v.url();
        let linkObject = new URL(l);
        let fileName = linkObject.pathname.split("/")[linkObject.pathname.split("/").length - 1].replace(/%20/g, "_");
        return { fileName, link: linkObject.href, page: v }
      });
      
      let data = await Promise.all(promisesTwo);
      await Promise.all(data.map(({ page }) => page.close()));
      ee.emit('getPDFs', { data, id: _id.toString(), type: 'transcript' });
    }
  });

  await page.close();
  await browser.close();
  await db.disconnect();

  logger.info('Connection closed, function complete.');
};

getTestimony();
