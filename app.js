require('dotenv').config();
const { SFRCSchema, SASCSchema } = require("./mongodb/schemas");

const crawler = require('./linkCrawler');
const downloadPDFs = require("./pdfDownloader");
const parsePDFs = require("./pdfParser");

// // SET VARIABLES FOR CRAWL
// let numberOfPagesToCrawl = Array(66).fill(1).map((x, y) => x + y);
// let baseLink = "https://www.foreign.senate.gov/hearings?PageNum_rs=XXXX" // https://www.armed-services.senate.gov/hearings?PageNum_rs=2&c=all
// let targetSchema = SFRCSchema;

// // RUN CRAWLER
// crawler(numberOfPagesToCrawl, baseLink, targetSchema);

// // SET VARIABLES FOR DOWNLOADER
// let targetSchema = SASCSchema;

// // DOWNLOAD PDFs
// downloadPDFs(targetSchema);

// // SET LOCATION DATA FOR PARSING
// let targetSchema = SASCSchema;
// let program = 'find';
// let args = [ '/Users/harrisoncramer/Vagrant/devCPU/machine/SASC_Scraper/pdfDownloader/pdfs/SASC', '-name', '*.pdf' ];
// parsePDFs(program, args, SASCSchema);