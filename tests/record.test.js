const ppg = require('../pico-pg.js');

let db;

const ops = ppg.ops;

let records = [];

const isUUID = (str)=>/[0-9a-fA-F]{8}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{12}/.test(str)

const random_uuid = '0d2c2216-aeda-4398-8ab3-48ae5493043d'

module.exports = {
	setup$ : async (t)=>{
		await ppg.connect(global.ppg_config);
		db = await ppg.table('ppg_testing');
	},

	add_records$ : async (t)=>{
		records.push(await db.add(global.dummyData.agatha));
		records.push(await db.add(global.dummyData.bronson));
		records.push(await db.add(global.dummyData.celeste));

		const res = await db.all();
		t.is(res.length , 3);

		const {id, created_at, updated_at, ...body} = res[0];

		t.is(body.name, global.dummyData.agatha.name);
		t.ok(isUUID(id));
		t.ok(created_at instanceof Date);
		t.ok(updated_at instanceof Date);
	},

	update : {
		updated_at_gets_updated : async (t)=>{
			const last_updated_at = records[0].updated_at;
			const res = await db.update({
				...records[0],
				post_count : 7,
				meta : {
					has_newsletter : false
				}
			});

			t.is(res.post_count, 7);
			t.not(res.updated_at, last_updated_at);
			t.is(res.meta.has_newsletter, false);
		},
		no_id_throws_err : async (t)=>{
			try{
				await d.update({})
				t.fail();
			}catch(err){
				t.pass()
			}
		},
		missing_id_throws_err : async (t)=>{
			try{
				await db.update({ id : random_uuid})
				t.fail();
			}catch(err){
				t.pass()
			}
		}
	},

	remove : {
		query : async (t)=>{
			const res = await db.remove({
				post_count : ops.gt(0)
			});
			t.is(res, 2);

			const remaining = await db.all();
			t.is(remaining.length, 1);
			t.is(remaining[0].name, 'Celeste')
		},

		single_record : async (t)=>{
			const res = await db.removeById(records[2].id);
			t.is(res, true);
			const res2 = await db.find({name : 'Celeste'});
			t.is(res2.length, 0);
		},

		can_not_find_record : async (t)=>{
			const res = await db.removeById(random_uuid);
			t.is(res, false);
		}

	},

	clear : async (t)=>{
		await db.add(global.dummyData.agatha);
		await db.clear();
		const res = await db.all();
		t.is(res.length, 0);
	},

	cleanup$ : async (t)=>{
		await ppg.tbl.destroy('ppg_testing');
		t.no(await ppg.tbl.exists('ppg_testing'));
		await ppg.disconnect();
	}
}