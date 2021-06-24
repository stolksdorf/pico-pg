require('../pico-pg.js');
require('../memory.js');

global.mem_mode = false;

global.ppg_config ={
	user: 'postgres',
	//host: 'database.server.com',
	//database: 'mydb',
	password: 'postgrespwd',
	port: 5433,
};

global.dummyData = {
	agatha : {
		name : 'Agatha',
		post_count : 54,
		tags : ['admin', 'user'],
		meta : {
			city : 'New York',
			has_newsletter : true
		},
		signup : new Date(2021, 2, 15),
	},
	bronson : {
		name : 'Bronson',
		post_count : 23,
		tags : ['dev', 'support'],
		meta : {
			city : 'Toronto',
			has_newsletter : false,
			can_create_stuff : true
		},
		signup : new Date(2021, 1, 22),
	},
	celeste : {
		name : 'Celeste',
		post_count : 0,
		tags : ['admin', 'dev'],
		meta : {
			city : 'New York',
			has_newsletter : false
		},
		signup : new Date(2021, 3, 29),
	},
};

module.exports = {
	postgres : {
		core : require('./core.test.js'),
		table : require('./table.test.js'),
		query : require('./query.test.js'),
		record : require('./record.test.js'),
		builder : require('./builder.test.js'),
	},
	mode_switch$ : (t)=>global.mem_mode = true,
	in_memory: {
		core : require('./core.test.js'),
		table : require('./table.test.js'),
		query : require('./query.test.js'),
		record : require('./record.test.js'),
		builder : require('./builder.test.js'),
	}
};

