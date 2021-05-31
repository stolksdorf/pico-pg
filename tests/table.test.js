const ppg = require('../pico-pg.js');

let db;

const isUUID = (str)=>/[0-9a-fA-F]{8}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{12}/.test(str)

module.exports = {
	setup : async (t)=>{
		await ppg.connect(global.ppg_config);
		db = await ppg.table('ppg_testing');
	},

	add : async (t)=>{
		const data = {
			foo : 'bar',
			nested : {
				value : true
			},
			tags : ['yo', 'dawg']
		};
		const record = await db.add(data);
		const {id, created_at, updated_at, ...body} = record;

		t.is(body, data);
		t.ok(isUUID(id));
		t.ok(created_at instanceof Date);
		t.ok(updated_at instanceof Date);
	},

	cleanup : async (t)=>{
		await ppg.tbl.destroy('ppg_testing');
		t.no(await ppg.tbl.exists('ppg_testing'));
		await ppg.disconnect();
	}
}