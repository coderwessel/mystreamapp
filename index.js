
'use strict';

const path = require('path');
const fs = require('fs');
const express = require('express');
const app = express();
const ytdl = require('ytdl-core');
const dotenv = require('dotenv');
const https = require('https');
dotenv.config();


const WEBSITE=process.env.MYSTREAMAPP_WEBSITE?process.env.MYSTREAMAPP_WEBSITE:"https://www.youtube.com/"
const WEBPATH=process.env.MYSTREAMAPP_WEBPATH?process.env.MYSTREAMAPP_WEBPATH:"results?search_query="
const CACHEPATH=process.env.MYSTREAMAPP_CACHEPATH?process.env.MYSTREAMAPP_CACHEPATH:"cached/"
const DATAFILEEXT=process.env.MYSTREAMAPP_DATAFILEEXT?process.env.MYSTREAMAPP_DATAFILEEXT:'.m4a'
const STATUSFILEEXT=process.env.MYSTREAMAPP_STATUSFILEEXT?process.env.MYSTREAMAPP_STATUSFILEEXT:'.downloading'
const PORT=process.env.MYSTREAMAPP_PORT?process.env.MYSTREAMAPP_PORT:3000


//var QUERY="waylon+outlaw";

function geturl(query,cb){
	console.log("looking for: "+WEBSITE+WEBPATH+query);
	https.get(WEBSITE+WEBPATH+query, (res) => {
	  const statusCode = res.statusCode;
	  //console.log(res);
	  const contentType = res.headers['content-type'];

	  var error;
	  if (statusCode !== 200) {
		error = new Error('Request Failed.\n' +
						  `Status Code: ${statusCode}`);
	  } else if (!/^text\/html/.test(contentType)) {
		error = new Error('Invalid content-type.\n' +
						  `Expected text/html but received ${contentType}`);
	  }
	  if (error) {
		console.error(error.message);
		// consume response data to free up memory
		res.resume();
		return;
	  }

	  res.setEncoding('utf8');
	  var rawData = '';
	  res.on('data', (chunk) => { rawData += chunk; });
	  res.on('end', () => {
		//console.log(rawData.toString());
		var rx = /(watch\?v=[^"]*)/gi, url
		//while (url = rx.exec(rawData.toString())) console.log(url[1]);
		var url = rx.exec(rawData.toString());
		console.log("got url:"+url[1]);
		cb(url[1]);
	   });
	}).on('error', (e) => {
	  console.error('Got error: '+ e.message);
	});
}

function FileExists(filename){
		var datafilepath=path.resolve(filename);
		//If yes return datafilepath
		  if (fs.existsSync(datafilepath)) {
			console.log("file "+datafilepath+" exists.");
			return datafilepath;
		  }
		  //else return false
		  else {
			console.log("file "+datafilepath+" doesnt exist.");
			return false;
		  }
}

//eg. http://localhost:3000/?play=waylon+outlaw
//eg. http://localhost:3000/?play=waylon outlaw
//eg. http://localhost:3000/?play=waylon%20outlaw

//eg. http://localhost:3000/?play=gareth bale goal vs liverpool

//allow CORS... experimental..
app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

app.get('/', function(req, res){
	console.log("received query: " + req.query.play);
	//geturl: check for a valid download url in the cloud (youtube)
	geturl(req.query.play, (url) => {
		//remove special characters to allow saving a file for caching
		var prettyfilename=req.query.play.replace(/[^a-zA-Z0-9 ]/g, "");
		// check if already cached on my server
		var datafilepath = FileExists(CACHEPATH+prettyfilename+DATAFILEEXT);
		var statusfilepath = FileExists(CACHEPATH+prettyfilename+STATUSFILEEXT);

		if (datafilepath && !statusfilepath) {
			//YES the file is cached and complete, send the cached file:
			console.log('sending cached copy: '+prettyfilename+DATAFILEEXT);
			res.sendFile(datafilepath);
		}
		else if (!datafilepath && !statusfilepath){
			//No complete cache found: make a new cache file on the server to write to
			fs.writeFile(CACHEPATH+prettyfilename+STATUSFILEEXT, 'downloading prettyfilename', (err) => {
				if (err) throw err;
				console.log("The status file was succesfully saved!");
				});

			const dest = fs.createWriteStream(CACHEPATH+prettyfilename+DATAFILEEXT);
			//and download the file in chunks
			console.log('trying to download: '+url);
			//from youtube
			var youtubelink=WEBSITE+url;

			//use ytdl-core
			var yts=ytdl(youtubelink, { filter: 'audioonly' });

			yts.on("data", function(data) {
				//send chunck to the client
				res.write(data);
				//and write it to the server cache for future use
				dest.write(data);
			});
			/*
			yts.stderr.on("data", function(data) {
				console.error(data.toString());
			});
			*/

			yts.on('end', function() {
						console.log("download finished: " + prettyfilename+DATAFILEEXT);
						dest.end();
						res.end();
						fs.unlink(CACHEPATH+prettyfilename+STATUSFILEEXT,function(err){
							if(err) return console.log(err);
							console.log(' status file deleted successfully: '+prettyfilename+STATUSFILEEXT);
						});
						return;
			});
		}
		else if(datafilepath && statusfilepath){
			console.log('already downloading in the background, sending separate copy from ytdl: '+url);
			//there is a cached file, but it is no yet complete: download from youtube, and leave cache alone.
			var youtubelink=WEBSITE+url;

			//use ytdl-core
			var yts=ytdl(youtubelink, { filter: 'audioonly' });

			yts.on("data", function(data) {
				//send chunck to the client
				res.write(data);
			});
			/*
			yts.stderr.on("data", function(data) {
				console.error(data.toString());
			});
			*/

			yts.on('end', function() {
						console.log("download finished: "+prettyfilename+DATAFILEEXT);
						res.end();
						return;
			});
		}
		else if(!datafilepath && statusfilepath){
			console.log('statusfile without datafile. Deleting statusfile');
			fs.unlink(CACHEPATH+prettyfilename+STATUSFILEEXT,function(err){
							if(err) return console.log(err);
							console.log(' status file deleted successfully: '+prettyfilename+STATUSFILEEXT);
						});
		}
		else {
			console.log('ERROR: unknown status')
		}
	});
});

app.listen(PORT);
console.log(`Server is listening on port ${PORT}`);
