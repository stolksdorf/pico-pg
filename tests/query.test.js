const ppg = require('../pico-pg.js');

const ops = ppg.ops;

let db;

let records = [];

module.exports = {
	setup$ : async (t)=>{
		await ppg.connect(global.ppg_config);
		db = await ppg.table('ppg_testing');
	},

	add_records$ : async (t)=>{
		records.push(await db.add(global.dummyData.agatha));
		records.push(await db.add(global.dummyData.bronson));
		records.push(await db.add(global.dummyData.celeste));

		t.is(records.length , 3);
	},

	exact_match : async (t)=>{
		let res = await db.find({
			name : 'Agatha'
		});
		t.ok(res.length, 1);
		t.is(res[0].name, 'Agatha');

		res = await db.find({
			post_count : 54
		});
		t.ok(res.length, 1);
		t.is(res[0].name, 'Agatha');
	},

	complicated_match : async (t)=>{
		const res = await db.find({
			post_count : ops.and(ops.gt(50), ops.lte(100)),
			meta : {
				has_newsletter : ops.or(true, false)
			}
		});
		t.is(res.length, 1);
		t.is(res[0].name, 'Agatha');
	},

	built_ins : {
		id : async (t)=>{
			const res = await db.find({
				id : records[0].id
			})
			t.is(res[0], records[0]);
		},
		created_at : async (t)=>{
			const res = await db.find({
				created_at : ops.before(new Date())
			})
			t.is(res.length, 3);
		}
	},
	ops : {
		numbers : {
			gt : async (t)=>{
				const res = await db.find({
					post_count : ops.gt(50)
				})
				t.is(res.length, 1);
				t.is(res[0], records[0]);
			},

		},

		array : {
			contains : async (t)=>{
				const res = await db.find({
					tags : ops.contains('admin')
				})
				t.is(res.length, 2);
				t.ok(res[0].tags.includes('admin'));
				t.ok(res[1].tags.includes('admin'));
			},
			contains_many : async (t)=>{
				const res = await db.find({
					tags : ops.contains('admin', 'user')
				})
				t.is(res.length, 1);
				t.ok(res[0].tags.includes('admin'));
				t.ok(res[0].tags.includes('user'));
			},
		},

		like : {

			case_insensitive : async (t)=>{
				const res = await db.find({
					name : ops.like('bronSon')
				})
				t.is(res.length, 1);
				t.is(res[0].name, 'Bronson');
			},
			partial_match : async (t)=>{
				const res = await db.find({
					name : ops.like('les')
				})
				t.is(res.length, 1);
				t.is(res[0].name, 'Celeste');
			}
		},


		dates : {
			equal : async (t)=>{
				const res = await db.find({
					signup : new Date(2021, 3, 29)
				})
				t.is(res.length, 1);
				t.is(res[0].name, 'Celeste');
			},
			notEqua1 : async (t)=>{
				const res = await db.find({
					signup : ops.not(new Date(2021, 3, 29))
				})
				t.is(res.length, 2);
				t.is(res[0].name, 'Agatha');
				t.is(res[1].name, 'Bronson');
			},
			before : async (t)=>{
				const res = await db.find({
					signup : ops.before(new Date(2021, 3, 1))
				});
				t.is(res.length, 2);
				t.is(res[0].name, 'Agatha');
				t.is(res[1].name, 'Bronson');
			},
			after : async (t)=>{
				const res = await db.find({
					signup : ops.after(new Date(2021, 2, 1))
				});
				t.is(res.length, 2);
				t.is(res[0].name, 'Agatha');
				t.is(res[1].name, 'Celeste');
			},
			combo : async (t)=>{
				const res = await db.find({
					signup : ops.and(ops.after(new Date(2021, 2, 1)), ops.before(new Date(2021, 3, 1)))
				});

				t.is(res.length, 1);
				t.is(res[0].name, 'Agatha');
			}
		}

	},

	findOne : async (t)=>{
		const res = await db.findOne({
			meta : {
				city : 'New York'
			}
		});
		t.not(Array.isArray(res));
		t.type(res.id, 'string');
		t.is(res.name, 'Agatha');
	},

	opts : {
		ordering : async (t)=>{
			const res = await db.all({
				sort : {
					meta : {
						city : -1,
					},
					post_count : 1
				}
			});
			t.is(res[0], records[1]);
			t.is(res[1], records[2]);
			t.is(res[2], records[0]);
		},

		offset_limit : async (t)=>{
			const res = await db.all({
				limit : 2,
				offset : 1
			});
			t.is(res.length, 2);
			t.is(res[0].id, records[1].id);
		},

		combo : async (t)=>{
			const res = await db.all({
				sort : {
					post_count : 1
				},
				limit : 2,
				offset : 1
			});
			t.is(res.length, 2);
			t.ok(res[0].post_count < res[1].post_count);
		}

	},

	cleanup$ : async (t)=>{
		await ppg.tbl.destroy('ppg_testing');
		t.no(await ppg.tbl.exists('ppg_testing'));
		await ppg.disconnect();
	}
}