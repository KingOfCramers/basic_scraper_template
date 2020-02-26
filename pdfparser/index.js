const fs = require('fs');
const path = require('path');
const PDFParser = require('pdf2json');
const util = require('util');
const spawn = require('child_process').spawn;

const runProgram = (x, args) => {
  const child = spawn(x, args);
  child.stdout.on('data', (data) => {
    let y = data.toString();
    console.log(y);
  });
};

let program = 'find';
let args = ['/Users/harrisoncramer/Vagrant/devCPU/machine/SASC_Scraper/pdfs', '-name', '*.pdf'];
runProgram(program, args);

//const pdfTextConverter = pdfPath => {

//let pdfParser = new PDFParser(this, 1);
//let pdfPathPieces = pdfPath.split("/");
//let pdfId = pdfPathPieces[2];
//let type = pdfPathPieces[3];
//let pdfPathLength = pdfPathPieces.length;
//let pdfTitle = pdfPathPieces[pdfPathLength - 1].replace(".pdf", ".txt");
//let newPdfPath = path.resolve(__dirname, "..", "pdfs", pdfId, type, pdfTitle);

//pdfParser.on('pdfParser_dataError', errData =>
//console.error(errData.parserError),
//);

//pdfParser.on('pdfParser_dataReady', _ => {
//fs.writeFile(newPdfPath, pdfParser.getRawTextContent(), (err, res) => {
//if (err) console.log('Error: ', err);
//if (res) console.log(`Converted file: ${newPdfPath}`);
//})
//});

//pdfParser.loadPDF(pdfPath);
//};

//pdfTextConverter("../pdfs/5e4f07014133d60d5fc5e8e1/testimony/Lyons_02-25-20.pdf");
