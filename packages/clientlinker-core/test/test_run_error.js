'use strict';

let Promise = require('bluebird');
let clientlinker = require('../');
let expect = require('expect.js');
let debug = require('debug')('clientlinker:test_run_error');

describe('#run_error', function() {
	it('#flow run Error', function() {
		let linker = clientlinker({
			flows: ['confighandler'],
			clients: {
				client: {
					confighandler: {
						method: function() {
							throw 333;
						},
						method2: function() {
							throw new Error('errmsg');
						}
					}
				},
				client2: {
					flows: []
				}
			}
		});

		linker.flow(
			'confighandler',
			require('clientlinker-flow-confighandler-test').flows.confighandler
		);

		let promise1 = new Promise(function(resolve) {
			linker.run('client.method', null, null, function(err) {
				expect(err).to.be(333);
				resolve();
			});
		});

		let promise2 = linker.run('client.method').then(
			function() {
				expect().fail();
			},
			function(err) {
				expect(err).to.be(333);
			}
		);

		let promise3 = linker.run('client.not_exit_method').then(
			function() {
				expect().fail();
			},
			function(err) {
				debug('err: %s', err.stack);
				expect(err.message).to.contain('CLIENTLINKER:NotFound');
				expect(err.CLIENTLINKER_TYPE).to.be('CLIENT FLOW OUT');
				// expect(err.CLIENTLINKER_ACTION).to.be('client.not_exit_method');
				// expect(err.CLIENTLINKER_CLIENT).to.be('client');
			}
		);

		let promise4 = linker.run('client1.method').then(
			function() {
				expect().fail();
			},
			function(err) {
				debug('err: %s', err.stack);
				expect(err.message).to.contain('CLIENTLINKER:NotFound');
				expect(err.CLIENTLINKER_TYPE).to.be('NO CLIENT');
				// expect(err.CLIENTLINKER_ACTION).to.be('client1.method');
			}
		);

		let promise5 = linker.run('client2.method').then(
			function() {
				expect().fail();
			},
			function(err) {
				debug('err: %s', err.stack);
				expect(err.message).to.contain('CLIENTLINKER:NotFound');
				expect(err.CLIENTLINKER_TYPE).to.be('CLIENT NO FLOWS');
				// expect(err.CLIENTLINKER_ACTION).to.be('client2.method');
				// expect(err.CLIENTLINKER_CLIENT).to.be('client2');
			}
		);

		let promise6 = linker.run('client.not_exit_method').then(
			function() {
				expect().fail();
			},
			function(err) {
				debug('err: %s', err.stack);
				expect(err).to.be.an(Error);
				expect(err.CLIENTLINKER_TYPE).to.be('CLIENT FLOW OUT');
				// expect(err.CLIENTLINKER_ACTION).to.be('client.not_exit_method');
				// expect(err.CLIENTLINKER_CLIENT).to.be('client');
				expect(err.fromClient).to.be('client');
				expect(err.fromClientFlow).to.be(undefined);
				expect(err.fromClientMethod).to.be('not_exit_method');
			}
		);

		let promise7 = linker.run('client.method2').then(
			function() {
				expect().fail();
			},
			function(err) {
				expect(err).to.be.an(Error);
				expect(err.message).to.be('errmsg');
				expect(err.fromClient).to.be('client');
				expect(err.fromClientFlow).to.be('confighandler');
				expect(err.fromClientMethod).to.be('method2');
			}
		);

		return Promise.all([
			promise1,
			promise2,
			promise3,
			promise4,
			promise5,
			promise6,
			promise7
		]);
	});

	it('#not exportErrorInfo', function() {
		let linker = clientlinker({
			flows: ['confighandler'],
			defaults: {
				exportErrorInfo: false
			},
			clients: {
				client: {
					confighandler: {
						method: function() {
							throw new Error('errmsg');
						}
					}
				}
			}
		});

		linker.flow(
			'confighandler',
			require('clientlinker-flow-confighandler-test').flows.confighandler
		);

		return linker.run('client.method').then(
			function() {
				expect().fail();
			},
			function(err) {
				expect(err).to.be.an(Error);
				expect(err.message).to.be('errmsg');
				expect(err.fromClient).to.be(undefined);
				expect(err.fromClientFlow).to.be(undefined);
				expect(err.fromClientMethod).to.be(undefined);
			}
		);
	});

	it('#anyToError', function() {
		let linker = clientlinker({
			flows: ['confighandler'],
			defaults: { anyToError: true },
			clients: {
				client: {
					confighandler: {
						method1: function(query, body, callback) {
							callback('errmsg');
						},
						method2: function(query, body, callback) {
							callback.reject();
						},
						method3: function(query, body, callback) {
							callback(-1);
						},
						method4: function(query, body, callback) {
							callback(new Error('errmsg'));
						}
					}
				}
			}
		});
		linker.flow(
			'confighandler',
			require('clientlinker-flow-confighandler-test').flows.confighandler
		);

		let promise1 = linker.run('client.method1').then(
			function() {
				expect().fail();
			},
			function(err) {
				expect(err).to.be.an(Error);
				expect(err.message).to.be('errmsg');
				expect(err.isClientLinkerNewError).to.be.ok();
			}
		);

		let promise2 = linker.run('client.method2').then(
			function() {
				expect().fail();
			},
			function(err) {
				expect(err).to.be.an(Error);
				expect(err.message).to.be('CLIENT_LINKER_DEFERT_ERROR');
				expect(err.isClientLinkerNewError).to.be.ok();
			}
		);

		let promise3 = linker.run('client.method3').then(
			function() {
				expect().fail();
			},
			function(err) {
				expect(err).to.be.an(Error);
				expect(err.message).to.be('client,client.method3,-1');
				expect(err.isClientLinkerNewError).to.be.ok();
			}
		);

		let promise4 = linker.run('client.method4').then(
			function() {
				expect().fail();
			},
			function(err) {
				expect(err).to.be.an(Error);
				expect(err.message).to.be('errmsg');
				expect(err.isClientLinkerNewError).to.not.be.ok();
			}
		);

		let promise5 = linker.run('client.method5').then(
			function() {
				expect().fail();
			},
			function(err) {
				expect(err).to.be.an(Error);
				expect(err.message).to.be(
					'CLIENTLINKER:NotFound,client.method5'
				);
				expect(err.isClientLinkerNewError).to.not.be.ok();
			}
		);

		return Promise.all([promise1, promise2, promise3, promise4, promise5]);
	});

	it('#from flow run', function() {
		let linker = clientlinker({
			flows: ['custom'],
			customFlows: {
				custom: function() {
					throw new Error('from flow run');
				}
			},
			clients: {
				client: null
			}
		});
		linker.flow(
			'confighandler',
			require('clientlinker-flow-confighandler-test').flows.confighandler
		);

		return linker.run('client.method').then(
			function() {
				expect().fail();
			},
			function(err) {
				expect(err.message).to.be('from flow run');
			}
		);
	});

	describe('#retry', function() {
		it('#in defualts', function() {
			let runTimes = 0;
			let triggerTimes = 0;
			let linker = clientlinker({
				flows: ['timingCheck', 'confighandler'],
				customFlows: {
					timingCheck: function(runtime, callback) {
						runTimes++;
						if (runTimes == 2) {
							expect(runtime.retry[0].timing.flowsEnd).to.be.ok();
						}

						return callback.next();
					}
				},
				defaults: {
					retry: 5,
					anyToError: true
				},
				clients: {
					client: {
						confighandler: {
							method: function(query, body, callback) {
								if (runTimes == 1) throw 333;
								else {
									callback(null, 555);
								}
							}
						}
					}
				}
			});
			linker.flow(
				'confighandler',
				require('clientlinker-flow-confighandler-test').flows
					.confighandler
			);

			let retPromise = linker.run('client.method').then(function(data) {
				expect(data).to.be(555);
				expect(runTimes).to.be(2);
				expect(triggerTimes).to.be(2);
			});

			linker.lastRuntime.on('retry', function() {
				triggerTimes++;
			});

			return retPromise;
		});

		it('#runOptions', function() {
			let runTimes = 0;
			let linker = clientlinker({
				flows: ['timingCheck', 'confighandler'],
				customFlows: {
					timingCheck: function(runtime, callback) {
						runTimes++;
						if (runTimes == 2) {
							expect(runtime.retry[0].timing.flowsEnd).to.be.ok();
						}

						return callback.next();
					}
				},
				clients: {
					client: {
						confighandler: {
							method: function(query, body, callback) {
								if (runTimes == 1) throw 333;
								else {
									callback(null, 555);
								}
							}
						}
					}
				}
			});
			linker.flow(
				'confighandler',
				require('clientlinker-flow-confighandler-test').flows
					.confighandler
			);

			return linker
				.run('client.method', null, null, { retry: 5 })
				.then(function(data) {
					expect(data).to.be(555);
					expect(runTimes).to.be(2);
				});
		});
	});

	it('#throw null err', function() {
		let linker = clientlinker({
			flows: ['confighandler'],
			clients: {
				client: {
					confighandler: {
						method: function() {
							return Promise.reject();
						}
					}
				}
			}
		});
		linker.flow(
			'confighandler',
			require('clientlinker-flow-confighandler-test').flows.confighandler
		);

		let resolve;
		let callbackPromise = new Promise(function(resolve0) {
			resolve = resolve0;
		});
		let runPromise = linker
			.run('client.method', null, null, function(err) {
				expect(err).to.be('CLIENT_LINKER_DEFERT_ERROR');
				resolve();
			})
			.then(
				function() {
					expect().fail();
				},
				function(err) {
					expect(err).to.be(undefined);
				}
			);

		return Promise.all([callbackPromise, runPromise]);
	});
});
