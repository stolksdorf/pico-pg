const ppg = require('../pico-pg.js');


module.exports = {
	setup : async (t)=>{
		await ppg.connect(global.ppg_config)
	},

	create: async (t)=>{
		await ppg.tbl.create('ppg_testing');
		t.ok(await ppg.tbl.exists('ppg_testing'));
	},

	list : async (t)=>{
		const tables = await ppg.tbl.list();
		t.type(tables, 'array');
		t.ok(tables.includes('ppg_testing'));
	},
	nonexist: async (t)=>{
		t.no(await ppg.tbl.exists('foobar'));
	},
	exist: async (t)=>{
		t.ok(await ppg.tbl.exists('ppg_testing'));
	},

	destroy: async (t)=>{
		await ppg.tbl.create('ppg_destroy_test');
		t.ok(await ppg.tbl.exists('ppg_destroy_test'))
		await ppg.tbl.destroy('ppg_destroy_test');
		t.no(await ppg.tbl.exists('ppg_destroy_test'))
	},

	cleanup : async (t)=>{
		await ppg.tbl.destroy('ppg_testing');
		t.no(await ppg.tbl.exists('ppg_testing'));
		await ppg.disconnect();
	}

}