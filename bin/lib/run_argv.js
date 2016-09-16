"use strict";

var _		= require('underscore');
var rlutils	= require('./rlutils');
var debug	= require('debug')('clientlinker:run_argv');



exports.runActionByArgv = runActionByArgv;
function runActionByArgv(linker, action, argvInfo, allMethods)
{
	action && (action = rlutils.parseAction(action, allMethods));
	if (!action) return false;

	rlutils.run(linker, action,
			rlutils.parseParam(linker, argvInfo.query),
			rlutils.parseParam(linker, argvInfo.body),
			rlutils.parseParam(linker, argvInfo.options)
		);

	return true;
}


exports.getAllMethods = getAllMethods;
function getAllMethods(list)
{
	var allMethods	= [];
	var lines		= [];
	var allFlowFrom	= [];
	var clientNames	= Object.keys(list).sort();

	clientNames.forEach(function(clientName)
	{
		var item = list[clientName];
		lines.push(
		{
			type: 'header',
			client: clientName
		});

		var methods = item && item.methods && Object.keys(item.methods).sort();
		if (methods && methods.length)
		{
			methods.forEach(function(method)
			{
				var froms = item.methods[method]
						.map(function(from)
						{
							return from && from.name;
						});

				var runKey = clientName+'.'+method;
				allFlowFrom.push.apply(allFlowFrom, froms);

				lines.push(
					{
						type	: 'line',
						index	: allMethods.push(runKey),
						method	: runKey,
						froms	: froms
					});
			});
		}
		else
		{
			lines.push({type: 'nomethods'});
		}
	});


	allMethods.lines = lines;
	allMethods.allFlowFrom = _.uniq(allFlowFrom)
		.sort()
		.map(function(name)
		{
			return name === undefined ? 'undefined' : name;
		});

	return allMethods;
}