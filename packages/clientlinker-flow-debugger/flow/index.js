'use strict';

var debuggerFlow = require('./debugger');

module.exports = function(flow)
{
	flow.run = debuggerFlow;
};
