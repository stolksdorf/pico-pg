const ppg = require('../pico-pg.js');
const ops = ppg.ops

const q = ppg.utils.queryBuilder;
const o = ppg.utils.optsBuilder

module.exports = {
	multiple : (t)=>{
		const res = q({
			name : ops.not('john'),
			meta : {
				count : ops.gt(50),
				tags : ops.contains('user', 'admin')
			},
			id : '123'
		})
		t.is(res, `WHERE __data__ #>> '{name}' <> 'john' AND (__data__ #>> '{meta,count}')::decimal > 50 AND __data__ #> '{meta,tags}' ?& '{user,admin}' AND id = '123'`)
	},

	boolean_ops : {
		or : (t)=>{
			const res = q({
				id : ops.or('abc', '123'),
				name : ops.or('john', 'sally'),
			})
			t.is(res, `WHERE (id = 'abc' OR id = '123') AND (__data__ #>> '{name}' = 'john' OR __data__ #>> '{name}' = 'sally')`);
		},

		and : (t)=>{
			const res = q({
				count : ops.and(ops.gt(20), ops.lt(50))
			})
			t.is(res, `WHERE ((__data__ #>> '{count}')::decimal > 20 AND (__data__ #>> '{count}')::decimal < 50)`);
		}
	},

	opts : {
		sorting : (t)=>{
			const res = o({
				sort : {
					created_at : 1,
					meta : {
						post_count : -1
					}
				}
			});
			t.is(res, `ORDER BY created_at ASC, __data__ #>> '{meta,post_count}' DESC`);
		},
		limits : (t)=>{
			const res = o({
				limit : 5,
				offset : 3
			});
			t.is(res, `LIMIT 5 OFFSET 3`)
		},
		combo : (t)=>{
			const res = o({
				sort : {
					meta : {
						post_count : -1
					}
				},
				limit : 1,
				offset : 5
			});
			t.is(res, `ORDER BY __data__ #>> '{meta,post_count}' DESC LIMIT 1 OFFSET 5`);
		}
	},
	no_query : (t)=>{
		t.is(q(false), '');
		t.is(q({}), '');
		t.is(q(null), '');
		t.is(q(), '');
	}

}