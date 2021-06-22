const ppg = require('../pico-pg.js');


module.exports = {
	not_connected : (t)=>{
		t.is(ppg.isConnected(), false);
	},
	setup : async (t)=>{
		await ppg.connect(global.ppg_config)
	},

	connected : (t)=>{
		t.is(ppg.isConnected(), true);
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

	destroy_clears_records : async (t)=>{
		let tbl = await ppg.table('ppg_destroy_test');

		await tbl.add({hello : true});
		let count = (await tbl.all()).length;
		t.is(count, 1);

		await ppg.tbl.destroy('ppg_destroy_test');
		t.no(await ppg.tbl.exists('ppg_destroy_test'));


		tbl = await ppg.table('ppg_destroy_test');
		await tbl.add({hello : false});
		count = (await tbl.all()).length;
		t.is(count, 1);

		await ppg.tbl.destroy('ppg_destroy_test');
	},

	cleanup : async (t)=>{
		await ppg.tbl.destroy('ppg_testing');
		t.no(await ppg.tbl.exists('ppg_testing'));
		await ppg.disconnect();
	},

	cleaned_up : (t)=>{
		t.is(ppg.isConnected(), false);
	},

}