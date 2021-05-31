# 🗃️ `pico-pg`

A light-weight javascript-based ORM that treats Postgres like a noSQL database.

<a href="https://www.npmjs.com/package/pico-pg"><img src="https://img.shields.io/npm/v/pico-pg?style=flat-square"></img></a>


Inspiration: https://rob.conery.io/2018/07/05/a-pure-postgresql-document-database-api/


### Example

```js
const ppg = require('pico-pg');
const ops = ppg.ops;

await ppg.connect({
	user: 'postgres',
	password: 'postgres_pwd',
	port: 5432,
})

const UserDB = await ppg.table('users');

let john_record = await UserDB.add({
	name : 'John Smith',
	post_count : 0,
	meta : {
		state : 'unverified',
	},
});

john_record = await UserDB.update({
	...john_record,
	post_count : 7,
	meta : { state : 'verified'}
});

const active_users = await UserDB.find({
	post_count : ops.gt(5),
	meta : { state : 'verified' },
	created_at : ops.after(new Date(2021, 3, 15))
});
```



### How it Works
`pico-pg` creates tables with 4 columns: `id`, `created_at`, `updated_at`, and `__data__` which is a JSONB type and holds your record's data. It then provides a series of tools to query and update these records very similar to [sequelize](https://sequelize.org/) and [mongoose](https://mongoosejs.com/docs/).



### Why use this?
Document-style databases are more flexible and easier to work with, especially when you aren't sure of the structure of your data yet. `pico-pg` lets you use Postgres while you are experimenting and building out your project. Once the schemas have settled you can do a single migration to a more performant schema structure without abusing the `jsonb` column type.




## API

#### `ppg.connect(pg_opts)`
Sets up a connection to Postgres. Passes `pg_opts` to the [`pg` library ](https://node-postgres.com/features/connecting)

#### `ppg.disconnect()`
Closes connection with Postgres

#### `ppg.query(sqlString)`
Executes the given `sqlQuery` on the Postgres connection


### Table Commands

#### `ppg.table(tableName)` -> `tbl` interface
Creates a new table (if it didn't exist) and returns a new interface to query, update, and remove records within that table.

#### `tbl.find(query, opts)`
Returns an array of records that match the given query. Queries are objects that describe the desired record structure. You can use the Query Operations below to filter your search.

`opts` object allows you to specify a `limit` and `offset`, as well as a `sort`

```js
await tbl.all({
	offset : 5, // skip the first 5
	limit : 10, //only return 10 records,
	sort : {
		post_count : 1, //sort by post_count ascending
		created_at : -1 //also sort by created_at, descending
	}
});
```

#### `tbl.findOne(query, opts)`
Same as `tbl.find()` except will only return a single record.

#### `tbl.all(opts)`
Returns all records. Can specify `limit`, `offset`, and `sort` via the `opts` (see `tbl.find`)

#### `tbl.clear()`
Truncates and removes all records from the table.

#### `tbl.add(data)`
Adds and returns a new record with the given data.

#### `tbl.update(data)`
Updates a given record (by the `id` within the `data`) with the new `data`. `updated_at` coloumn will be updated automatically.


#### `tbl.remove(query)`
Removes records from the table that match the `query` obj. Returns the number of records removed.

#### `tbl.removeById(uuid)`
Removes a single record matching the provided `uuid`. Returns `true` if successful and `false` if it could not find the record.




### Query Operations
Use the following operators to build complicated queries.

```js
await db.find({
	name : ops.like('john'),
	post_count : ops.gte(100),
	meta : {
		status : ops.or('verified', 'god_mode'),
		tags : ops.contains('admin', 'user')
	}
	created_at : ops.and(ops.after(new Date(2021, 0, 1)), ops.before(new Date(2021, 3, 15)))
})

```


#### `ppg.ops.eq(val)`
Equivilance operator. If no other operator is used, defaults to this.

#### `ppg.ops.not(val)`
Not equivilance operator.

#### `ppg.ops.gt(val)`, `ppg.ops.lt(val)`, `ppg.ops.gte(val)`, `ppg.ops.lte(val)`
Numerical operators:

#### `ppg.ops.contains(...values)`
Used for matching arrays. Must contain each of the `values`


#### `ppg.ops.like(substring)`
Case-insensitive substring search.


#### `ppg.ops.before(target_date)`, `ppg.ops.after(target_date)`
Date searches.

#### `ppg.ops.or(...parameters)`, `ppg.ops.and(...parameters)`
Used to build more complicated boolean queries.


### Database Commands

#### `ppg.tbl.list()`
Returns an array of existing table names in the database

#### `ppg.tbl.exists(tableName)`
Returns true or false if the table exists in the database

#### `ppg.tbl.destroy(tableName)`
Drops the table from the database

#### `ppg.tbl.create(tableName)`
Creates a new table (if it doesn't already exists) with 4 columns: `id` a uuid primary key, `created_at` and `updated_at` set as a `TIMESTAMPZ` to now, and `__data__` as JSONB



### General Utils

#### `ppg.utils.version()`
Returns Postgres' version as a string

#### `ppg.utils.queryBuilder(queryObj)`
Returns a SQL query string based on the query object. Used internally by other commands.

#### `ppg.utils.optsBuilder(optsObj)`
Returns a SQL string based on the opts object. Sets up `ORDER BY`, `LIMIT`, and `OFFSET` parameters. Used internally by other commands.

