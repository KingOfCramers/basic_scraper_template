require('dotenv').config();
const events = require('events');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');

const connect = require('./mongodb/connect');
const getAll = require('./mongodb/methods/getAll');
const { SASCSchema } = require('./mongodb/schemas');

const downloader = require("./downloader");
const {asyncForEach} = require('./util');
const logger = require('./logger')(module);

const ee = new events.EventEmitter();
ee.on('getPDFs', async ({ downloadItems, id }) => {
  let promises = downloadItems.map(({ pdfLink, type }) => downloader(pdfLink, id, type));
  await Promise.all(promises);
  logger.info(`Finished writing all PDFs for ${id}`);
});

let getTestimony = async () => {
  const db = await connect();
  const browser = await puppeteer.launch({headless: false});
  const page = await browser.newPage();

  let data = await getAll(SASCSchema);
  logger.info('Fetched SASC Links...');

  // For every page....
  await asyncForEach(data, async datum => {
    const {link, _id, date} = datum;
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

    let downloadItems = [];

    if (hearingTestimony.length) {
      let promises = hearingTestimony.map(_ => browser.newPage());
      let pages = await Promise.all(promises);
      let promisesTwo = pages.map(async (v, i) => {
        logger.info( `[${date}] > testimony #${i + 1} of ${hearingTestimony.length} for ${link}`);
        await v.goto(hearingTestimony[i], {waitUntil: 'networkidle2'});
        await v.waitFor(4000);
        //await Promise.all([ v.$eval('div.row a', x => x.click()), v.waitForNavigation() ]);
        let pdfLink = v.url();
        downloadItems.push({ page: v, pdfLink, type: 'testimony' })
      });

      await Promise.all(promisesTwo);
      await Promise.all(downloadItems.map(({ page }) => page.close()));
      // PERHAPS THIS EMIT SHOULD GO BELOW?
      ee.emit('getPDFs', { downloadItems, id: _id.toString() });
    }

    if (hearingTranscript.length) {
      // Same as above.
      console.log('Write logic for hearingTranscript!');
    }
  });

  await page.close();
  await browser.close();
  await db.disconnect();

  logger.info('Connection closed, function complete.');
};

getTestimony();
