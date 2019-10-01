# sql-mapper

### How to install

`npm i node-sql-mapper`

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

### Example for advanced update

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
  and: {
    user_id: {
      '>': 123,
      '<': 1000
    },
    phone: 123456,
    create_time: {
      'not in': [new Date()]
    }
  }
}
const sql = fns.advancedUpdate({ where, data, mapping, tableName })
// sql will be "UPDATE test_table SET `name` = 'Harry Potter' WHERE `user_id` > 123 AND `user_id` < 1000 AND `phone` = 123456 AND `create_time` NOT IN('2019-10-02 00:13:21.897')"
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

### Example for advanced delete

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
  and: {
    user_id: {
      '>': 123,
      '<': 1000
    },
    phone: 123456,
    create_time: {
      'not in': [new Date()]
    }
  }
}
const sql = fns.advancedDelete({ where, mapping, tableName })
// sql will be "DELETE FROM test_table WHERE `user_id` > 123 AND `user_id` < 1000 AND `phone` = 123456 AND `create_time` NOT IN('2019-10-02 00:14:22.254')"
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

### Example for query

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
  and: {
    user_id: {
      '>': 1,
      '<=': 5
    },
    phone: {
      in: [123, 321]
    }
  },
  or: {
    password: '123456'
  }
}
const sql = fns.query({ select, where, mapping, tableName })
// sql will be "SELECT `user_id`, `borders` FROM test_table WHERE `user_id` > 1 AND `user_id` <= 5 AND `phone` IN(123,321) OR `password` = '123456'"
```
