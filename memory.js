/* In-memory version of pico-pg to be used for development and testing purposes only */

let connected = false;
let Data = {};

const opKey = Symbol();

const isObj = (obj)=>!!obj && (typeof obj == 'object' && obj.constructor == Object);

function uuidv4() {
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
		var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
		return v.toString(16);
	});
}

const tableUtils = {
	list : async ()=>{
		return Object.keys(Data);
	},
	exists : async (tblName)=>{
		return !!Data[tblName];
	},
	destroy : async (tblName)=>{
		delete Data[tblName];
	},
	create : async (tblName)=>{
		if(!Data[tblName]) Data[tblName] = {};
		return;
	},
};

const utils = {
	version : async ()=>['in', 'memory', 'mode'],
	queryBuilder : async ()=>{ throw `Sorry, queryBuilder not supported in memory-mode` },
	optsBuilder : async ()=>{ throw `Sorry, optsBuilder not supported in memory-mode` },
};

const Operations = {
	eq : (field, val)=>{
		if(field instanceof Date) return field.getTime() == val[0].getTime();
		return field==val[0];
	},
	not : (field, val)=>!Operations.eq(field, val),


	gt : (field, val)=>field > val[0],
	lt : (field, val)=>field < val[0],
	gte : (field, val)=>field >= val[0],
	lte : (field, val)=>field <= val[0],

	contains : (field, val)=>val.every(v=>field.includes(v)),
	like : (field, val)=>field.toLowerCase().indexOf(val[0].toLowerCase()) !== -1,

	before : (field, val)=>field < val[0],
	after : (field, val)=>field > val[0],

	or : (field, val)=>val.some(v=>runOp(field, v)),
	and : (field, val)=>val.every(v=>runOp(field, v)),
};

const flatten = (obj)=>{
	let result = [];
	const recur = (obj, path=[])=>{
		if(obj[opKey] || !isObj(obj)) return result.push([path, obj]);
		Object.entries(obj).map(([k,v])=>{
			recur(v, path.concat(k))
		});
	}
	recur(obj);
	return result;
}

const get = (obj, path)=>{
	if(path.length == 0) return obj;
	return get((obj||{})[path[0]], path.slice(1));
}

const optsFilter = (opts={}, records)=>{
	let limit = opts.limit || records.length;
	let offset = opts.offset || 0;
	if(opts.sort){
		let sortOpts = flatten(opts.sort);
		records = records.sort((A,B)=>{
			let res = 0;
			sortOpts.map(([path, dir])=>{
				if(res!==0) return;
				const a=get(A,path),b=get(B,path);
				if(a>b) res = 1 * dir;
				if(a<b) res = -1 * dir;
			})
			return res;
		});
	}
	return records.slice(offset, offset + limit);
};

const runOp = (field, obj)=>{
	let op='eq', args = [obj];
	if(obj[opKey]){
		op = obj[opKey];
		args = obj.args
	}
	return Operations[op](field, args);
};

const queryFilter = (query={}, records)=>{
	flatten(query).map(([path, op])=>{
		records = records.filter(record=>runOp(get(record, path), op))
	});
	return records;
};


const mem = {
	connect : async ()=>{
		connected = true;
	},
	disconnect : async ()=>{
		connected = false;
	},
	isConnected : ()=>connected,
	query : async (sqlQuery)=>{
		throw 'Sorry, raw SQL queries are not supported in memory-mode';
	},

	tbl : tableUtils,
	utils,


	ops : Object.keys(Operations).reduce((acc, key)=>{
		acc[key] = (...args)=>{return {[opKey] : key, args}};
		return acc;
	}, {}),


	loadRawData : (data)=>Data=data,
	getRawData : ()=>Data,

	table : async (tblName)=>{
		await mem.tbl.create(tblName);

		const tbl = {
			clear : async ()=>{
				Data[tblName] = {};
			},
			all : async (opts)=>{
				return optsFilter(opts, Object.values(Data[tblName]));
			},
			add : async (input)=>{
				let {id, created_at, updated_at, ...data} = input;
				id = uuidv4();
				Data[tblName][id] = {
					...data,
					id,
					created_at : new Date(),
					updated_at : new Date()
				};
				return Data[tblName][id];
			},
			find : async (query={}, opts={})=>{
				return optsFilter(opts, queryFilter(query, Object.values(Data[tblName])))
			},
			findOne : async (query={}, opts={})=>{
				return (await tbl.find(query, {...opts, limit : 1}))[0];
			},
			update : async (input={})=>{
				let {id, created_at, updated_at, ...data} = input;
				if(!id){ throw 'No id provided to update record'; }
				if(!Data[tblName][id]){ throw `Could not find record to update`; }
				Data[tblName][id] = {
					...Data[tblName][id],
					...data,
					updated_at : new Date()
				}
				return Data[tblName][id];
			},
			remove : async (query={})=>{
				let count = 0;
				queryFilter(query, Object.values(Data[tblName])).map(({id})=>{
					count++;
					delete Data[tblName][id];
				});
				return count;
			},
			removeById : async (id)=>{
				if(!Data[tblName][id]) return false;
				delete Data[tblName][id];
				return true;
			},
		}
		return tbl;
	}
};

module.exports = mem;