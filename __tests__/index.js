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
  it('Should ignore the undefined and null values', () => {
    let where = {
      user_id: 123,
      phone: null
    }
    let data = {
      name: 'Harry Potter',
      phone: undefined
    }
    expect(fns.update({ where, data, mapping, tableName })).toBe(
      `UPDATE test_table SET \`name\` = 'Harry Potter' WHERE \`user_id\` = 123`
    )
  })
})
