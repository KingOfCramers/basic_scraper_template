const fs = require('fs');
const _ = require('lodash');
const path = require('path');
const PDFParser = require('pdf2json');
const spawn = require('child_process').spawn;
const EventEmitter = require('events');
const logger = require("../logger")(module);
const { asyncForEach } = require("../util");

const pdfTextConverter = ({ pdfPath, schema }) => new Promise((resolve, reject) => {

  let schemaName = schema.modelName;
  let pdfParser = new PDFParser(this, 1);
  let pdfPathPieces = pdfPath.split('/');
  let pdfId = pdfPathPieces[10];
  let type = pdfPathPieces[11];
  let pdfPathLength = pdfPathPieces.length;
  let pdfTitle = pdfPathPieces[pdfPathLength - 1].replace('.pdf', '.txt');
  let newPdfPath = path.resolve(__dirname, '..', 'pdfDownloader', 'pdfs', schemaName, pdfId, type, pdfTitle);

  pdfParser.on('pdfParser_dataError', errData => reject(errData));

  pdfParser.on('pdfParser_dataReady', _ => {
    fs.writeFile(newPdfPath, pdfParser.getRawTextContent(), (err, res) => {
      if (err) {
        reject('Error: ', err)
      } else {
        resolve(`${newPdfPath}\n`);
      }
    });
  });

  pdfParser.loadPDF(pdfPath);

});

const ee = new EventEmitter();
ee.on('processPDFs', async ({ documents, schema }) => {
  let chunked = _.chunk(documents, 10);
  let num = 1;
  asyncForEach(chunked, async (chunk) => {
    logger.info(`Working on chunk ${num}`);
    // if(num < 193){ // Errors on chunk 25, 115 through 117, 192
    //   num++
    //   return;
    // }

    try {
      let results = await Promise.all(chunk.map(pdfPath => pdfTextConverter({ pdfPath, schema })));
      logger.info(`Read ${num * 10} of ${documents.length}`);
      logger.info(results)
      num++
    } catch (err) {
      logger.info(`Problem with chunk`, err);
    }
  });
});

const parsePDFs = (x, args, schema) => {
  const child = spawn(x, args);

  documents = [];
  child.stdout.on('data', data => {
    let y = data.toString().split('\n');
    let z = y.filter((v, i) => {
      let doesEndWithPDF = v.endsWith('.pdf');
      let doesStartWithUser = v.startsWith('/Users/');
      if (!doesEndWithPDF || !doesStartWithUser) {
        return false;
      }
      return true;
    });
    documents.push(...z);
  });

  child.on('exit', code => {
    if (parseInt(code) !== 0){
      logger.info('There was a problem with the code.', code);
    } else {
      logger.info(`${documents.length} pdfs to process...`)
      ee.emit('processPDFs', { documents, schema });
    }
  });
};

module.exports = parsePDFs;