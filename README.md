# sql-mapper

### Allowed Mapping Types

- `number` : Float , Int ,... etc
- `string` : Text , Varchar ,.... etc
- `datetime` : Datetime
- `point` : Point(X,Y)
- `polygon` : Polygon [ {x , y} , {x, y} .... ]

### How to run tests

```
npm install
```

```
npm test
```

### Example for insertion

```js
const fns = require('node-sql-mapper')
let mapping = {
  user_id: 'number',
  create_time: 'datetime',
  name: 'string',
  password: 'string',
  phone: 'number',
  location: 'point',
  borders: 'polygon'
}
let tableName = 'test_table'
let data = {
  location: {
    y: 12.22,
    x: 12.33
  },
  user_id: 123,
  create_time: new Date(),
  name: 'Harry Potter'
}
const sql = fns.insert({ data, mapping, tableName })
// sql will be "INSERT INTO test_table SET location = POINT(12.33,12.22)  `user_id` = 123, `create_time` = 2019-09-20 23:25:59.957, `name` = 'Harry Potter'"
```

### Example for update

```js
const fns = require('node-sql-mapper')
let mapping = {
  user_id: 'number',
  create_time: 'datetime',
  name: 'string',
  password: 'string',
  phone: 'number',
  location: 'point',
  borders: 'polygon'
}
let tableName = 'test_table'
let data = {
  name: 'Harry Potter'
}
let where = {
  user_id: 123
}
const sql = fns.update({ where, data, mapping, tableName })
// sql will be "UPDATE test_table SET `name` = 'Harry Potter' WHERE `user_id` = 123"
```

### Example for delete

```js
const fns = require('node-sql-mapper')
let mapping = {
  user_id: 'number',
  create_time: 'datetime',
  name: 'string',
  password: 'string',
  phone: 'number',
  location: 'point',
  borders: 'polygon'
}
let tableName = 'test_table'
let where = {
  user_id: 123
}
const sql = fns.delete({ where, mapping, tableName })
// sql will be "DELETE FROM test_table WHERE `user_id` = 123"
```

### Example for get

```js
const fns = require('node-sql-mapper')
let mapping = {
  user_id: 'number',
  create_time: 'datetime',
  name: 'string',
  password: 'string',
  phone: 'number',
  location: 'point',
  borders: 'polygon'
}
let tableName = 'test_table'
let select = ['user_id', 'borders', 'ignored']
let where = {
  user_id: 123,
  phone: 123456
}
const sql = fns.get({ select, where, mapping, tableName })
// sql will be "SELECT 'user_id', 'borders' FROM test_table WHERE `user_id` = 123 AND `phone` = 123456"
```
