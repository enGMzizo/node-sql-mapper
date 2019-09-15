const { escape } = require('mysql')
const fns = require('../index')
let mapping = {
  user_id: 'number',
  create_time: 'datetime',
  name: 'string',
  password: 'string',
  phone: 'number',
  location: 'point'
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
    expect(fns.insert.bind(null, { data, mapping, tableName })).toThrowError(
      'Unexpected data value null or undefined'
    )
  })
})
