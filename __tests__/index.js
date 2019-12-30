const { escape } = require('mysql')
const fns = require('../index')
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
describe('Mapping insert to SQL', () => {
  it('Should return insert statment', () => {
    let data = {
      location: {
        y: 12.22,
        x: 12.33
      },
      user_id: 123,
      create_time: new Date(),
      name: 'Harry Potter'
    }
    expect(fns.insert({ data, mapping, tableName })).toBe(
      `INSERT INTO test_table SET location = POINT(${data.location.x},${
      data.location.y
      }),\`user_id\` = 123, \`create_time\` = ${escape(
        data.create_time
      )}, \`name\` = 'Harry Potter'`
    )
  })
  it('Should not allow null values', () => {
    let data = {
      location: {
        y: 12.22,
        x: 12.33
      },
      user_id: 123,
      create_time: new Date(),
      name: null
    }
    expect(fns.insert({ data, mapping, tableName })).toBe(
      `INSERT INTO test_table SET location = POINT(${data.location.x},${
      data.location.y
      }),\`user_id\` = 123, \`create_time\` = ${escape(data.create_time)}`
    )
  })
  it('Should not allow undefined', () => {
    let data = {
      location: {
        y: 12.22,
        x: 12.33
      },
      user_id: 123,
      create_time: new Date(),
      name: undefined
    }
    expect(fns.insert({ data, mapping, tableName })).toBe(
      `INSERT INTO test_table SET location = POINT(${data.location.x},${
      data.location.y
      }),\`user_id\` = 123, \`create_time\` = ${escape(data.create_time)}`
    )
  })
  it('Should not use unexpected object', () => {
    let data = {
      user_id: 123,
      name: { name: 'test' }
    }
    expect(fns.insert({ data, mapping, tableName })).toBe(
      `INSERT INTO test_table SET \`user_id\` = 123`
    )
  })
  it('Should use expected datatype', () => {
    let data = {
      user_id: new Number(123),
      name: new String('test')
    }
    expect(fns.insert({ data, mapping, tableName })).toBe(
      `INSERT INTO test_table SET \`user_id\` = '123', \`name\` = 'test'`
    )
  })
  it('Should drop unexpected datatype', () => {
    let data = {
      phone: '123',
      password: '123'
    }
    expect(fns.insert({ data, mapping, tableName })).toBe(
      `INSERT INTO test_table SET \`password\` = '123'`
    )
  })
  it('Should throw error', () => {
    let data
    expect(() => {
      fns.insert({ data, mapping, tableName })
    }).toThrowError('Unexpected data value null or undefined')
  })
  it('Should allow polygons', () => {
    let data = {
      borders: [
        {
          y: 12.22,
          x: 12.33
        },
        {
          y: 13.22,
          x: 13.33
        }
      ],
      user_id: 123,
      create_time: new Date(),
      name: undefined
    }
    expect(fns.insert({ data, mapping, tableName })).toBe(
      `INSERT INTO test_table SET borders = ST_GeomFromText('POLYGON(12.33  12.22,13.33  13.22)'),\`user_id\` = 123, \`create_time\` = ${escape(
        data.create_time
      )}`
    )
  })
  it('Should throw error because polygon is not array', () => {
    let data = {
      borders: 'String',
      user_id: 123,
      create_time: new Date(),
      name: undefined
    }
    expect(() => {
      fns.insert({ data, mapping, tableName })
    }).toThrowError('Invalid Ploygon value of borders')
  })
  it('Should throw error because polygon is not array', () => {
    let data = {
      borders: [
        {
          y: 12.22,
          x: 12.33
        },
        {
          y: 13.22,
          x: 'Hello'
        }
      ],
      user_id: 123,
      create_time: new Date(),
      name: undefined
    }
    expect(() => {
      fns.insert({ data, mapping, tableName })
    }).toThrowError('Invalid X value of borders[1]: Hello')
  })
})
describe('Mapping replace to SQL', () => {
  it('Should return replace statment', () => {
    let data = {
      location: {
        y: 12.22,
        x: 12.33
      },
      user_id: 123,
      create_time: new Date(),
      name: 'Harry Potter'
    }
    expect(fns.replace({ data, mapping, tableName })).toBe(
      `REPLACE INTO test_table SET location = POINT(${data.location.x},${
      data.location.y
      }),\`user_id\` = 123, \`create_time\` = ${escape(
        data.create_time
      )}, \`name\` = 'Harry Potter'`
    )
  })
})

describe('Mapping update to SQL', () => {
  it('Should return update statment', () => {
    let where = {
      user_id: 123,
      phone: 123456
    }
    let data = {
      name: 'Harry Potter'
    }
    expect(fns.update({ where, data, mapping, tableName })).toBe(
      `UPDATE test_table SET \`name\` = 'Harry Potter' WHERE \`user_id\` = 123 AND \`phone\` = 123456`
    )
  })
  it('Should ignore the undefined and null values in data', () => {
    let where = {
      user_id: 123
    }
    let data = {
      name: 'Harry Potter',
      phone: undefined
    }
    expect(fns.update({ where, data, mapping, tableName })).toBe(
      `UPDATE test_table SET \`name\` = 'Harry Potter' WHERE \`user_id\` = 123`
    )
  })
  it('Should throw error if where has wrong values', () => {
    let where = {
      user_id: 123,
      phone: null
    }
    let data = {
      name: 'Harry Potter'
    }
    expect(() => {
      fns.update({ where, data, mapping, tableName })
    }).toThrowError('Invalid value phone : null in where object')
  })
  it('Should return advanced update statment', () => {
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

    let data = {
      name: 'Harry Potter'
    }
    expect(fns.advancedUpdate({ where, data, mapping, tableName })).toBe(
      `UPDATE test_table SET \`name\` = 'Harry Potter' WHERE \`user_id\` > 123 AND \`user_id\` < 1000 AND \`phone\` = 123456 AND \`create_time\` NOT IN(${escape(
        where.and.create_time['not in'][0]
      )})`
    )
  })
})

describe('Mapping delete to SQL', () => {
  it('Should return delete statment', () => {
    let where = {
      user_id: 123,
      phone: 123456
    }
    expect(fns.delete({ where, mapping, tableName })).toBe(
      `DELETE FROM test_table WHERE \`user_id\` = 123 AND \`phone\` = 123456`
    )
  })
  it('Should allow null where to delete all', () => {
    expect(fns.delete({ mapping, tableName })).toBe(
      `DELETE FROM ${tableName} `
    )
  })
  it('Should throw error if where has wrong values', () => {
    let where = {
      user_id: 123,
      phone: null
    }
    expect(() => {
      fns.delete({ where, mapping, tableName })
    }).toThrowError('Invalid value phone : null in where object')
  })
  it('Should return advanced delete statment', () => {
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

    expect(fns.advancedDelete({ where, mapping, tableName })).toBe(
      `DELETE FROM test_table WHERE \`user_id\` > 123 AND \`user_id\` < 1000 AND \`phone\` = 123456 AND \`create_time\` NOT IN(${escape(
        where.and.create_time['not in'][0]
      )})`
    )
  })
})

describe('Mapping get to SQL', () => {
  it('Should return get statment', () => {
    let select = ['user_id', 'borders', 'ignored']
    let where = {
      user_id: 123,
      phone: 123456
    }
    expect(fns.get({ select, where, mapping, tableName })).toBe(
      `SELECT \`user_id\`, \`borders\` FROM test_table WHERE \`user_id\` = 123 AND \`phone\` = 123456`
    )
  })
  it('Should select all values', () => {
    let where = {
      user_id: 123,
      phone: 123456
    }
    expect(fns.get({ where, mapping, tableName })).toBe(
      `SELECT * FROM test_table WHERE \`user_id\` = 123 AND \`phone\` = 123456`
    )
  })
  it('Should return selection without where statment', () => {
    let select = ['user_id', 'borders', 'ignored']
    expect(fns.get({ select, mapping, tableName })).toBe(
      `SELECT \`user_id\`, \`borders\` FROM test_table`
    )
  })

  it('Should change the offset and limit default values with ignoring the order thing ', () => {
    let select = ['user_id', 'borders', 'ignored']
    expect(fns.get({ select, mapping, tableName, offset: [20, 10] })).toBe(
      `SELECT \`user_id\`, \`borders\` FROM test_table LIMIT 20, 10`
    )
  })

  it('Should change the orderBy and order default values ', () => {
    let select = ['user_id', 'borders', 'ignored']
    expect(fns.get({ select, mapping, tableName, order: { by: 'user_id', sort: 'DESC' } })).toBe(
      `SELECT \`user_id\`, \`borders\` FROM test_table ORDER BY \`user_id\` DESC`
    )
  })
  it('Should change the both orders and limits default values ', () => {
    let select = ['user_id', 'borders', 'ignored']
    expect(fns.get({ select, mapping, tableName, order: { by: 'user_id', sort: 'ASC' }, offset: [15, 5] })).toBe(
      `SELECT \`user_id\`, \`borders\` FROM test_table ORDER BY \`user_id\` ASC LIMIT 15, 5`
    )
  })

  it('Should Throw an error offset not array', () => {
    let select = ['user_id', 'borders', 'ignored']
    expect(() => {
      fns.get({ select, mapping, tableName, offset: 1 })
    }).toThrowError('Unexpected offset value has to be an array')
  })

  it('Should Throw an error offset length', () => {
    let select = ['user_id', 'borders', 'ignored']
    expect(() => {
      fns.get({ select, mapping, tableName, offset: [] })
    }).toThrowError('Unexpected offset value has to be an array of [index,limit]')
  })
})

describe('Mapping advanced WHERE to SQL', () => {
  it('Should return query statment', () => {
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
    expect(fns.query({ select, where, mapping, tableName })).toBe(
      `SELECT \`user_id\`, \`borders\` FROM test_table WHERE \`user_id\` > 1 AND \`user_id\` <= 5 AND \`phone\` IN(123,321) OR \`password\` = '123456'`
    )
  })
})


describe('Mapping advanced WHERE to SQL and count', () => {
  it('Should return query statment with count', () => {
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
    expect(fns.query({ select, where, mapping, tableName, count: 'c' })).toBe(
      `SELECT \`user_id\`, \`borders\` FROM test_table WHERE \`user_id\` > 1 AND \`user_id\` <= 5 AND \`phone\` IN(123,321) OR \`password\` = '123456';SELECT COUNT(*) AS \`c\` FROM test_table WHERE \`user_id\` > 1 AND \`user_id\` <= 5 AND \`phone\` IN(123,321) OR \`password\` = '123456'`
    )
  })

  it('Should return count statment only', () => {
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
    expect(fns.count({ as :'c', where, mapping, tableName })).toBe(
      `SELECT COUNT(*) AS \`c\` FROM test_table WHERE \`user_id\` > 1 AND \`user_id\` <= 5 AND \`phone\` IN(123,321) OR \`password\` = '123456'`
    )
  })
  it('Should Throw an error count', () => {
    let select = ['user_id', 'borders', 'ignored']
    expect(() => {
      fns.query({ select, mapping, tableName, count:' ' })
    }).toThrowError('Unexpected count value')
  })
  it('Should Throw an error count', () => {
    let select = ['user_id', 'borders', 'ignored']
    expect(() => {
      fns.query({ select, mapping, tableName, count: 1 })
    }).toThrowError('Unexpected count value has to be string')
  })
})