const pg = require('pg')

let Client;
const opKey = Symbol();

const isObj = (obj)=>!!obj && (typeof obj == 'object' && obj.constructor == Object);
const isDate = (obj)=>(obj instanceof Date);
const isBasicType = (val)=>typeof val == 'string' || typeof val == 'number' || typeof val == 'boolean';

const flattenRecord = (record)=>{
	const {id, created_at, updated_at, __data__} = record;
	return {id, created_at, updated_at, ...__data__};
}

const tableUtils = {
	list : async ()=>{
		const {rows} = await ppg.query(`SELECT * FROM pg_catalog.pg_tables WHERE schemaname != 'pg_catalog' AND schemaname != 'information_schema';`);
		return rows.map(row=>row.tablename);
	},
	exists : async (tblName)=>{
		const {rowCount} = await ppg.query(`SELECT 1 FROM pg_catalog.pg_tables WHERE schemaname != 'pg_catalog' AND schemaname != 'information_schema' AND tablename = '${tblName}'`);
		return rowCount == 1;
	},
	destroy : async (tblName)=>{
		return await ppg.query(`DROP TABLE IF EXISTS ${tblName}`);
	},
	create : async (tblName)=>{
		return await ppg.query(`
			CREATE TABLE IF NOT EXISTS ${tblName}(
				id UUID primary key NOT NULL DEFAULT gen_random_uuid(),
				__data__ JSONB NOT NULL DEFAULT '{}'::jsonb,
				created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
				updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
			)`);
	},
};

const utils = {
	version : async ()=>{
		return (await ppg.query(`SHOW server_version;`)).rows[0].server_version.split('.');
	},
	queryBuilder : (query={})=>{
		const fields = collapseObj(query);
		if(fields.length == 0) return '';
		return `WHERE ${
			fields.map(([val, path])=>{
				return getQuery(val, path);
			}).join(' AND ')
		}`;
	},
	optsBuilder : (opts={})=>{
		let result = [];
		if(opts.sort){
			result.push(`ORDER BY ` + collapseObj(opts.sort).map(([val, path])=>{
				return `${getField(path)} ${(val > 0 ? 'ASC' : 'DESC')}`
			}).join(', '));
		}
		if(opts.limit) result.push(`LIMIT ${opts.limit}`);
		if(opts.offset) result.push(`OFFSET ${opts.offset}`);

		return result.join(' ');
	},
};

const Operations = {
	eq : (vals, path, op)=>{
		return `${getField(path, op, vals[0])} = ${getValue(vals[0])}`;
	},
	not : (vals, path, op)=>{
		return `${getField(path, op, vals[0])} <> ${getValue(vals[0])}`;
	},

	gt  : (vals, path, op)=>`(${getField(path, op)})::decimal > ${vals[0]}`,
	lt  : (vals, path, op)=>`(${getField(path, op)})::decimal < ${vals[0]}`,
	gte : (vals, path, op)=>`(${getField(path, op)})::decimal >= ${vals[0]}`,
	lte : (vals, path, op)=>`(${getField(path, op)})::decimal <= ${vals[0]}`,

	contains : (vals, path, op)=>`${getField(path, op)} ?& '{${vals.join(',')}}'`,
	like : (vals, path, op)=>`${getField(path, op)} ILIKE '%${vals[0]}%'`,

	before  : (vals, path, op)=>{
		return `${getField(path, op, vals[0])} < '${vals[0].toISOString()}'`
	},
	after  : (vals, path, op)=>{
		return `${getField(path, op, vals[0])} > '${vals[0].toISOString()}'`
	},
	or : (vals, path, op)=>`(${vals.map(val=>getQuery(val, path)).join(' OR ')})`,
	and : (vals, path, op)=>`(${vals.map(val=>getQuery(val, path)).join(' AND ')})`,
};

const getValue = (val)=>{
	if(isBasicType(val)){
		return `'${val}'`;
	}else if(Array.isArray(val)){
		return `array${JSON.stringify(val)}`;
	}else if(isDate(val)){
		return `'${val.toISOString()}'`;
	}
	return val;
};

const getField = (paths, operator, val)=>{
	if(paths.length == 1 && ['id', 'created_at', 'updated_at'].includes(paths[0])){
		return paths[0];
	}else if(operator == 'contains'){
		return `__data__ #> '{${paths.join(',')}}'`;
	}else if(isDate(val)){
		return `(__data__ #>> '{${paths.join(',')}}')::date`;
	}else{
		return `__data__ #>> '{${paths.join(',')}}'`;
	}
};

const getQuery = (arg, path)=>{
	if(!arg[opKey]) arg = {[opKey] : 'eq', args : [arg]};
	const op = arg[opKey];
	return Operations[op](arg.args, path, op);
};

const collapseObj = (obj={})=>{
	let res = [];
	const recur = (obj, path=[])=>{
		Object.entries(obj).map(([key, val])=>{
			if(isObj(val) && !val[opKey]) return recur(val, path.concat(key));
			res.push([val, path.concat(key)]);
		})
	}
	recur(obj || {});
	return res;
};

const ppg = {
	connect : async (opts)=>{
		if(Client) return;
		Client = new pg.Client(opts);
		await Client.connect();
		const [major, minor, path] = await ppg.utils.version();
		if(Number(major) < 13) throw 'Must use Postgres version 13 or greater';
	},
	disconnect : async ()=>{
		if(!Client) return;
		const res = await Client.end();
		Client = null;
		return res;
	},
	query : async (sqlQuery)=>{
		if(!Client){ throw 'Not connected to Postgres'; }
		return Client.query(sqlQuery);
	},

	tbl : tableUtils,
	utils,

	ops : Object.keys(Operations).reduce((acc, key)=>{
		acc[key] = (...args)=>{return {[opKey] : key, args}};
		return acc;
	}, {}),

	table : async (tblName)=>{
		await ppg.tbl.create(tblName);

		const tbl = {
			clear : async ()=>ppg.query(`TRUNCATE ${tblName}; DELETE FROM ${tblName};`),
			all : async (opts)=>{
				const {rows} = await ppg.query(`SELECT * FROM ${tblName} ${ppg.utils.optsBuilder(opts)}`);
				return rows.map(flattenRecord);
			},
			add : async (input)=>{
				const {id, created_at, updated_at, ...data} = input;
				const {rows} = await ppg.query(`INSERT INTO ${tblName}(__data__) VALUES ('${JSON.stringify(data)}') RETURNING *;`)
				return flattenRecord(rows[0]);
			},
			find : async (query={}, opts={})=>{
				let q = `SELECT * FROM ${tblName} ${ppg.utils.queryBuilder(query)} ${ppg.utils.optsBuilder(opts)};`;
				const {rows} = await ppg.query(q);
				return rows.map(flattenRecord);
			},
			findOne : async (query={}, opts={})=>{
				return (await tbl.find(query, {...opts, limit : 1}))[0];
			},
			update : async (input={})=>{
				const {id, created_at, updated_at, ...data} = input;
				if(!id){ throw 'No id provided to update record'; }
				let q = `UPDATE ${tblName} SET __data__ = '${JSON.stringify(data)}'::jsonb, updated_at = now() WHERE id = '${id}' RETURNING *`;
				const {rows} = await ppg.query(q);
				if(rows.length==0){ throw `Could not find record to update`; }
				return flattenRecord(rows[0]);
			},
			remove : async (query={})=>{
				let q = `DELETE FROM ${tblName} ${ppg.utils.queryBuilder(query)};`;
				const res = await ppg.query(q);
				return res.rowCount;
			},
			removeById : async (id)=>{
				return (await tbl.remove({id})) == 1;
			}
		}
		return tbl;
	}
};

module.exports = ppg;