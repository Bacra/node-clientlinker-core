var Promise		= require('bluebird');
var _			= require('underscore');
var fs			=  require('fs');
var Linker		= require('./lib/main').Linker;
var debug		= require('debug')('client_linker');
var flowsPath	= __dirname+'/flows/';

/**
 * [options]
 * 	flows
 * 	httpproxy
 * 	clients
 * 	clientDefaultOptions
 * 	hiprotoDir
 * 	localfileDir
 * 	pkghandlerDir
 */
exports = module.exports = ClientLinker;
function ClientLinker(options)
{
	var linker = new Linker();

	options || (options = {});
	var clientDefaultOptions = options.clientDefaultOptions || (options.clientDefaultOptions = {});

	if (options.flows)
	{
		options.flows.forEach(function(name)
		{
			if (exports.supportMiddlewares.indexOf(name) != -1)
			{
				var pkg;
				try {
					pkg = require(flowsPath+name+'/'+name);
				}
				catch(e)
				{
					debug('load flow pkg <%s> err:%o', name, e);
				}

				if (pkg && typeof pkg == 'function')
					linker.bindFlow(name, pkg);
				else
					debug('not pkg:%s, %o', name, pkg);
			}
		});

		// 延续flows
		if (!clientDefaultOptions.flows)
		{
			clientDefaultOptions.flows = options.flows;
		}
	}

	if (options.customFlows)
	{
		_.each(options.customFlows, function(handle, name)
		{
			linker.bindFlow(name, handle);
		});
	}

	linker.initConfig(options);

	// client options
	var clients = options.clients;
	if (clients)
	{
		_.each(clients, function(clientOptions, name)
		{
			clientOptions = _.extend({}, clientDefaultOptions, clientOptions);

			if (!clientOptions.flows && options.flows)
				clientOptions.flows = options.flows.slice();

			linker.addClient(name, clientOptions);
		});
	}

	linker.clients()
		.then(function(clients)
		{
			debug('init clients:%s', Object.keys(clients));
		});

	return linker;
};

exports.supportMiddlewares = fs.readdirSync(flowsPath)
	.filter(function(b)
	{
		return b != '.' && b != '..' && b[0] != '.';
	});
