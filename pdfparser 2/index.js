const fs = require('fs');
const _ = require('lodash');
const path = require('path');
const PDFParser = require('pdf2json');
const spawn = require('child_process').spawn;
const EventEmitter = require('events');
const { asyncForEach } = require("../util");

const pdfTextConverter = pdfPath => new Promise((resolve, reject) => {

  //let wait = setTimeout(() => {
    //clearTimeout(wait);
    //reject(`Took too long for ${pdfPath}`);
  //}, 7000);

  let pdfParser = new PDFParser(this, 1);
  let pdfPathPieces = pdfPath.split('/');
  let pdfId = pdfPathPieces[8];
  let type = pdfPathPieces[9];
  let pdfPathLength = pdfPathPieces.length;
  let pdfTitle = pdfPathPieces[pdfPathLength - 1].replace('.pdf', '.txt');
  let newPdfPath = path.resolve(__dirname, '..', 'pdfs', pdfId, type, pdfTitle);

  pdfParser.on('pdfParser_dataError', errData => reject(errData));

  pdfParser.on('pdfParser_dataReady', _ => {
    fs.writeFile(newPdfPath, pdfParser.getRawTextContent(), (err, res) => {
      if (err) {
        reject('Error: ', err)
      } else {
        resolve(`Converted file: ${newPdfPath}`);
      }
    });
  });

  pdfParser.loadPDF(pdfPath);

});

const ee = new EventEmitter();
ee.on('processPDFs', async listOfPdfs => {
  let chunked = _.chunk(listOfPdfs, 10);
  let num = 1;
  asyncForEach(chunked, async (chunk) => {
    console.log(`Working on chunk ${num}`);
    if(num < 193){ // Errors on chunk 25, 115 through 117, 192
      num++
      return;
    }

    try {
      let results = await Promise.all(chunk.map(pdfPath => pdfTextConverter(pdfPath)));
      console.log(`Read ${num * 10} of ${listOfPdfs.length}`);
      console.log(results)
      num++
    } catch (err) {
      console.log(`Problem with chunk`, err);
    }
  });
});


let documents = [];
const runProgram = (x, args) => {
  const child = spawn(x, args);

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
      console.log('There was a problem with the code.', code);
    } else {
      console.log(`${documents.length} pdfs to process...`)
      ee.emit('processPDFs', documents);
    }
  });
}

let program = 'find';
let args = [ '/Users/harrisoncramer/Vagrant/devCPU/machine/SASC_Scraper/pdfs', '-name', '*.pdf' ];

runProgram(program, args);
