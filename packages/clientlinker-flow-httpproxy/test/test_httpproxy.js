'use strict';

let expect = require('expect.js');
let request = require('request');
let httpproxy = require('../flow/httpproxy');
let utilsTestHttpproxy = require('./utils_test');
let confighandlerTest = require('clientlinker-flow-confighandler-test');

let initLinker = utilsTestHttpproxy.initLinker;
let initTestSvrLinker = utilsTestHttpproxy.initTestSvrLinker;

describe('#httpproxy', function() {
	describe('#utils', function() {
		it('#appendUrl', function() {
			expect(httpproxy.appendUrl_('http://127.0.0.1/', 'a=1')).to.be(
				'http://127.0.0.1/?a=1'
			);
			expect(httpproxy.appendUrl_('http://127.0.0.1/?', 'a=1')).to.be(
				'http://127.0.0.1/?a=1'
			);
			expect(httpproxy.appendUrl_('http://127.0.0.1/?b=1', 'a=1')).to.be(
				'http://127.0.0.1/?b=1&a=1'
			);
			expect(httpproxy.appendUrl_('http://127.0.0.1/?b=1&', 'a=1')).to.be(
				'http://127.0.0.1/?b=1&a=1'
			);
		});
	});

	describe('#err statusCode', function() {
		describe('#5xx', function() {
			initTestSvrLinker();
			let linker = initLinker({
				flows: ['custom'],
				customFlows: {
					custom: function custom(runtime, callback) {
						let body = httpproxy.getRequestBody_(runtime);
						let opts = httpproxy.getRequestParams_(runtime, body);
						httpproxy.appendRequestTimeHeader_(runtime, opts);

						request.post(opts, function(err, response, body) {
							callback.resolve({
								err: err,
								response: response,
								body: body
							});
						});
					}
				}
			});

			let linker2 = initLinker();

			describe('#501', function() {
				function itKey(name, action) {
					it('#request:' + name, function() {
						return linker.run(action).then(function(data) {
							expect(data.err).to.be(null);
							expect(data.response.statusCode).to.be(501);
						});
					});

					it('#run:' + name, function() {
						let retPromise = linker2.run(action);
						let runtime = linker2.lastRuntime;

						return retPromise.then(
							function() {
								expect().fail();
							},
							function(err) {
								let responseError = runtime.debug(
									'httpproxyResponseError'
								);
								expect(responseError.message).to.be(
									'httpproxy,response!200,501'
								);
								expect(err.message.substr(0, 22)).to.be(
									'CLIENTLINKER:NotFound,'
								);
							}
						);
					});
				}

				itKey('method not exists', 'client_its.method_no_exists');
				itKey('no flows', 'client_svr_noflows.method');
				itKey('no client', 'client_svr_not_exists.method');
			});
		});

		describe('#5xx_parse', function() {
			initTestSvrLinker();
			let linker = initLinker({
				flows: ['custom'],
				customFlows: {
					custom: function custom(runtime, callback) {
						let body = httpproxy.getRequestBody_(runtime);
						let opts = httpproxy.getRequestParams_(runtime, body);
						httpproxy.appendRequestTimeHeader_(runtime, opts);

						opts.body = '{dd';
						request.post(opts, function(err, response, body) {
							callback.resolve({
								err: err,
								response: response,
								body: body
							});
						});
					}
				}
			});

			it('#err', function() {
				return linker
					.run('client_its.method_promise_resolve')
					.then(function(data) {
						expect(data.err).to.be(null);
						expect(data.response.statusCode).to.be(500);
						let body = JSON.parse(data.body);
						expect(body.httpproxy_msg).to.be.an('array');
						expect(body.httpproxy_msg.join()).to.contain(
							'clientlinker run err:'
						);
					});
			});
		});
	});

	describe('#options', function() {
		describe('#httpproxyKey', function() {
			let httpproxyKey = 'xxfde&d023';
			initTestSvrLinker({
				defaults: {
					httpproxyKey: httpproxyKey
				}
			});

			describe('#run client', function() {
				confighandlerTest.run(
					initLinker({
						defaults: {
							httpproxyKey: httpproxyKey
						}
					})
				);
			});

			describe('#err403', function() {
				function itKey(name, statusCode, key) {
					it('#' + name, function() {
						let linker = initLinker({
							flows: ['custom'],
							defaults: {
								httpproxyKey: httpproxyKey
							},
							customFlows: {
								custom: function custom(runtime, callback) {
									let body = httpproxy.getRequestBody_(
										runtime
									);
									let opts = httpproxy.getRequestParams_(
										runtime,
										body
									);
									httpproxy.appendRequestTimeHeader_(
										runtime,
										opts
									);

									if (key) {
										opts.headers['XH-Httpproxy-Key2'] = key;
									} else if (key === null) {
										delete opts.headers['XH-Httpproxy-Key'];
										delete opts.headers[
											'XH-Httpproxy-Key2'
										];
									}

									request.post(opts, function(
										err,
										response,
										body
									) {
										callback.resolve({
											err: err,
											response: response,
											body: body
										});
									});
								}
							}
						});

						return linker
							.run('client_its.method')
							.then(function(data) {
								expect(data.err).to.be(null);
								expect(data.response.statusCode).to.be(
									statusCode
								);
								expect(data.body).to.contain('route catch:');
							});
					});
				}

				itKey('normal', 200);
				itKey('err key', 403, 'dddd');
				itKey('no key', 403, null);
				itKey('direct', 403, httpproxyKey);

				it('#repeat', function() {
					let firstOtps = null;
					let linker = initLinker({
						flows: ['custom'],
						defaults: {
							httpproxyKey: httpproxyKey
						},
						customFlows: {
							custom: function custom(runtime, callback) {
								if (!firstOtps) {
									let body = httpproxy.getRequestBody_(
										runtime
									);
									firstOtps = httpproxy.getRequestParams_(
										runtime,
										body
									);
									httpproxy.appendRequestTimeHeader_(
										runtime,
										firstOtps
									);
								}

								request.post(firstOtps, function(
									err,
									response,
									body
								) {
									callback.resolve({
										err: err,
										response: response,
										body: body
									});
								});
							}
						}
					});

					return linker
						.run('client_its.method')
						.then(function(data) {
							expect(data.err).to.be(null);
							expect(data.response.statusCode).to.be(200);
							expect(data.body).to.contain('route catch:');
						})
						.then(function() {
							return linker.run('client_its.method');
						})
						.then(function(data) {
							expect(data.err).to.be(null);
							expect(data.response.statusCode).to.be(403);
							expect(data.body).to.contain('route catch:');
						});
				});

				it('#check signa', function() {
					let linker = initLinker({
						flows: ['custom'],
						defaults: {
							httpproxyKey: httpproxyKey
						},
						customFlows: {
							custom: function custom(runtime, callback) {
								let body = httpproxy.getRequestBody_(runtime);
								let opts = httpproxy.getRequestParams_(
									runtime,
									body
								);
								httpproxy.appendRequestTimeHeader_(
									runtime,
									opts
								);

								opts.body = opts.body.replace(/\t/g, '  ');

								request.post(opts, function(
									err,
									response,
									body
								) {
									callback.resolve({
										err: err,
										response: response,
										body: body
									});
								});
							}
						}
					});

					return linker.run('client_its.method').then(function(data) {
						expect(data.err).to.be(null);
						expect(data.response.statusCode).to.be(403);
						expect(data.body).to.contain('route catch:');
					});
				});
			});
		});

		describe('#httpproxyMaxLevel', function() {
			function descKey(svrLevel) {
				function itClientKey(clientLevel) {
					it('#client run level:' + clientLevel, function() {
						let linker = initLinker({
							defaults: {
								httpproxyMaxLevel: clientLevel
							}
						});
						let retPromise = linker.run(
							'client_its.method_no_exists'
						);
						let runtime = linker.lastRuntime;

						return retPromise.then(
							function() {
								expect().fail();
							},
							function(err) {
								expect(err.CLIENTLINKER_TYPE).to.be(
									'CLIENT FLOW OUT'
								);
								expect(runtime.env.source).to.be('run');

								if (clientLevel === 0) {
									expect(
										runtime.tmp.httpproxyLevelTotal
									).to.be(undefined);
									expect(runtime.tmp.httpproxyLevel).to.be(
										undefined
									);
									let responseError = runtime.retry[0].getRunnedFlowByName(
										'httpproxy'
									).httpproxyResponseError;
									expect(responseError).to.be(undefined);
								} else {
									let targetSvrLevel =
										svrLevel > 0 ? svrLevel : 1;
									expect(
										runtime.tmp.httpproxyLevelTotal
									).to.be(targetSvrLevel);
									expect(runtime.tmp.httpproxyLevel).to.be(1);
									let responseError = runtime.debug(
										'httpproxyResponseError'
									);
									expect(responseError.message).to.be(
										'httpproxy,response!200,501'
									);
									expect(err.message.substr(0, 22)).to.be(
										'CLIENTLINKER:NotFound,'
									);
								}
							}
						);
					});
				}

				describe('#svrLevel:' + svrLevel, function() {
					initTestSvrLinker({
						// flows: ['httpproxy'],
						defaults: {
							httpproxyMaxLevel: svrLevel
						}
					});

					describe('#run new client', function() {
						confighandlerTest.run(initLinker({}));
					});

					itClientKey(1);
					itClientKey(5);
					itClientKey();
					itClientKey(0);
					itClientKey(-1);
				});
			}

			descKey(3);
			descKey(1);
			descKey();
			descKey(0);
			descKey(-1);
		});
	});

	describe('#env', function() {
		describe('#httpproxyHeader', function() {
			initTestSvrLinker({
				clients: {
					client_svr_customflow: {
						flows: ['it_customflow']
					}
				},
				customFlows: {
					it_customflow: function custom(runtime, callback) {
						callback.resolve({
							httpproxyHeaders: runtime.env.httpproxyHeaders
						});
					}
				}
			});

			it('#httpproxyHeader', function() {
				let linker = initLinker({
					defaults: {
						httpproxyHeaders: {
							httpproxyCustomHeader: 'httpproxyCustomHeader'
						}
					},
					clients: {
						client_svr_customflow: {}
					}
				});

				return linker
					.run('client_svr_customflow.method')
					.then(function(data) {
						expect(
							data.httpproxyHeaders.httpproxycustomheader
						).to.be('httpproxyCustomHeader');
					});
			});
		});

		describe('#httpproxyQuery', function() {
			initTestSvrLinker({
				clients: {
					client_svr_customflow: {
						flows: ['it_customflow']
					}
				},
				customFlows: {
					it_customflow: function custom(runtime, callback) {
						callback.resolve({
							httpproxyQuery: runtime.env.httpproxyQuery
						});
					}
				}
			});

			it('#httpproxyQuery', function() {
				let linker = initLinker({
					httpproxyQuery: 'custom_query=xxxx',
					clients: {
						client_svr_customflow: {}
					}
				});

				return linker
					.run('client_svr_customflow.method')
					.then(function(data) {
						expect(data.httpproxyQuery.custom_query).to.be('xxxx');
					});
			});
		});
	});
});
