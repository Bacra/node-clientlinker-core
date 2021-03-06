const fs = require('fs');
const path = require('path');
const mkdirp = require('mkdirp');
const util = require('util');

const utilsTestHttpproxy = require('../test/utils_test');
const confighandlerTest = require('clientlinker-flow-confighandler-test');

const LOG_FILE = __dirname + '/../test/tmp/allways_runinfo.log';
const PORT = 3233;
const EACH_REPEAT = 20;
const MAX_LAST_RUNTIME_LENGTH = 10;

mkdirp.sync(path.dirname(LOG_FILE));
const ws = fs.createWriteStream(LOG_FILE);

utilsTestHttpproxy.PORT = PORT;
const linker = utilsTestHttpproxy.initLinker();
const svr = utilsTestHttpproxy.initSvrLinker();
svr.start();

function runAll(index) {
	const startTime = Date.now();
	const promises = confighandlerTest.run.tests.map(function(handler) {
		const arr = [];
		for (let i = EACH_REPEAT; i--; ) {
			arr.push(handler(linker));
		}

		return Promise.all(arr);
	});

	return Promise.all(promises).then(
		function() {
			printSuc(index, startTime);
		},
		function(err) {
			printFail(index, startTime, err);
		}
	);
}

function runNext(index) {
	runAll(++index).then(function() {
		setTimeout(function() {
			runNext(index);
		}, 500);
	});
}

let lastRunTimes = [];
let runTimeTotal = 0;
let runErrorTimes = 0;
function printSuc(index, startTime) {
	const endTime = Date.now();
	const useTime = endTime - startTime;
	runTimeTotal += useTime;

	logHandler('run suc index[%d] use:%dms', index, useTime);

	lastRunTimes = lastRunTimes.slice(0, MAX_LAST_RUNTIME_LENGTH - 1);
	lastRunTimes.unshift(useTime);

	if (!(index % MAX_LAST_RUNTIME_LENGTH)) {
		let total = 0;
		let last10 = 0;
		lastRunTimes = lastRunTimes.filter(function(time) {
			if (time) {
				last10++;
				total += time;
				return true;
			}
		});

		logHandler(
			'avg time:%sms last10 avg:%sms last10:%s',
			index - runErrorTimes &&
				(runTimeTotal / (index - runErrorTimes)).toFixed(2),
			last10 && (total / last10).toFixed(2),
			lastRunTimes.join(',')
		);
	}
}

function printFail(index, startTime, err) {
	const endTime = Date.now();
	runErrorTimes++;
	logHandler(
		'run err index[%d] use:%dms err:%s',
		index,
		endTime - startTime,
		err.stack
	);
}

function logHandler() {
	const now = new Date();
	const msg = util.format(
		'[allways] %d %d-%s-%s %s:%s:%s,%d %s',
		process.pid,
		now.getFullYear(),
		zero(now.getMonth() + 1),
		zero(now.getDate()),
		zero(now.getHours()),
		zero(now.getMinutes()),
		zero(now.getSeconds()),
		now.getMilliseconds(),
		util.format.apply(null, arguments)
	);

	console.log(msg);
	ws.write(msg + '\n');
}

function zero(num) {
	if (num > 0) return num > 10 ? '' + num : '0' + num;
	else return '00';
}

runNext(0);
