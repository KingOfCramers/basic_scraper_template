const events = require('events');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');

const connect = require('../mongodb/connect');
const getAll = require('../mongodb/methods/getAll');

const writer = require('./writer');
const { asyncForEach } = require('../util');
const logger = require('../logger')(module);

const sascLogic = ($) => {
  let hearingTestimony = $('a.hearing-pdf')
      .toArray()
      .map(v => $(v).attr('href'));
    let hearingTranscript = $("a[style='text-transform: capitalize;']")
      .toArray()
      .map(v => $(v).attr('href'));
  return { hearingTestimony, hearingTranscript };
};

const ee = new events.EventEmitter();
ee.on('getPDFs', async ({downloadItems, id, collection }) => {
  let promises = downloadItems.map(({pdfLink, type}) => writer(pdfLink, id, type, collection));
  await Promise.all(promises);
  logger.info(`Finished writing all PDFs for ${id}`);
});

let downloadPDFs = async (targetSchema) => {
  const db = await connect();
  const browser = await puppeteer.launch({headless: false});
  const page = await browser.newPage();
  let data = await getAll(targetSchema);
  logger.info(`Fetched ${targetSchema.modelName} Links...`);
  await db.disconnect();

  // This is useful to use if the function fails and we need to restart at a specific _id.
  // let latest = 0;
  // data.forEach((v,i,) => {
  //   let isLatest = v._id.toString() == "5e4f073c4133d60d5fc5ebc5u";
  //   if(isLatest){
  //     latest = i;
  //   }
  // });
  // data = data.filter((v,i) => i > latest);

  // For every page....
  await asyncForEach(data, async datum => {
    const {link, _id, date} = datum;
    await page.goto(link, {waitUntil: 'networkidle2'});
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
    })(targetSchema.modelName);
    
    let { hearingTestimony, hearingTranscript } = logic($);

    let downloadItems = [];
    let testimonyNewPages = hearingTestimony.map(_ => browser.newPage());
    let testimonyPages = await Promise.all(testimonyNewPages);
    let testimonyPromises = testimonyPages.map(async (v, i) => {
      logger.info(`[${date}] > testimony #${i + 1} of ${ hearingTestimony.length } for ${link}`);
      await v.goto(hearingTestimony[i], {waitUntil: 'networkidle2'});
      try {
        await v.waitForSelector('embed'); // await specific 'embed' tag after navigation on new PDF page..
        let pdfLink = v.url();
        downloadItems.push({page: v, pdfLink, type: 'testimony'});
      } catch (err) {
        logger.info(`Could not download testimony for ${_id.toString()}`);  
      }
    });

    let transcriptNewPages = hearingTranscript.map(_ => browser.newPage());
    let transcriptPages = await Promise.all(transcriptNewPages);
    let transcriptPromises = await transcriptPages.map(async (v,i) => {
      logger.info(`[${date}] > transcript #${i + 1} of ${hearingTranscript.length} for ${link}`);
      await v.goto(hearingTranscript[i], {waitUntil: 'networkidle2'});
      try {
        await v.waitForSelector('embed'); // await specific 'embed' tag after navigation on new PDF page..
        let pdfLink = v.url();
        downloadItems.push({page: v, pdfLink, type: 'transcript'});
      } catch (err) {
        logger.info(`Could not download transcript for ${_id.toString()}`);  
      }
    });

    await Promise.all([ ...testimonyPromises, ...transcriptPromises ]);
    await Promise.all(downloadItems.map(({page}) => page.close()));
    ee.emit('getPDFs', {downloadItems, id: _id.toString(), collection: targetSchema.modelName });

  });

  await page.close();
  await browser.close();

  logger.info('Connection closed. Scraping complete.');
};

module.exports = downloadPDFs;