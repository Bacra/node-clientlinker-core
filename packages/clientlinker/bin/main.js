const Command = require('./lib/command').Command;
const commandActions = require('./lib/command_actions');
const stdout = require('./lib/stdout');

const command = new Command();

command.list().action(function(conf_file, command) {
	commandActions
		.listAction(conf_file, command.__clk_options__)
		.catch(function(err) {
			stdout.verbose(err);
		})
		.then(exit);
});

command.exec().action(function(conf_file, action, command) {
	commandActions
		.execAction(conf_file, action, command.__clk_options__, true)
		.catch(function(err) {
			stdout.verbose(err);
		})
		.then(exit);
});

command.anycmd();
command.help().action(function() {});

const argv = process.argv.slice();
if (argv.length < 3) argv.push('--help');

command.program.parse(argv);

function exit() {
	stdout.promise.then(function() {
		process.exit();
	});
}
