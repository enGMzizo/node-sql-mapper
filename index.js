const mysql = require('mysql')

/*
  example
  data = {
    user_id,
    create_time,
    name,
    location
  }
  mapping = {
    user_id: 'number' || Number,
    create_time: 'datetime' || Date,
    name: 'string' || String,
    location: 'point' //  x , y for geolocation lng , lat
  }
  tableName = 'test_name'

 */
module.exports = {
  insert: ({ data, mapping, tableName }) => {
    checkInsertInput({ data, mapping, tableName })
    const points = []
    const item = Object.entries(data).reduce((o, [nm, val]) => {
      if (mapping[nm] !== undefined && val !== undefined && val !== null) {
        switch (mapping[nm]) {
          case 'string':
            if (typeof val === 'string' || val instanceof String) {
              o[nm] = formatString(val.toString())
            }
            break
          case 'number':
            if (typeof val === 'number' || val instanceof Number) {
              o[nm] = val
            }
            break
          case 'datetime':
            if (typeof val === 'string' || val instanceof Date) {
              o[nm] = val
            }
            break
          case 'point':
            points.push(extractPoint({ name: nm, value: val }))
            break
        }
      }
      return o
    }, {})
    return `${mysql.format(
      `INSERT INTO ${tableName} SET ${makePoitsSQL(points)}?`,
      item
    )}`
  }
}

function makePoitsSQL(points) {
  return points ? `${points.join(',')}` : ''
}

//helper function for location
function extractPoint({ name, value }) {
  if (value === undefined || value === null) {
    return ''
  }
  if (value.x !== undefined && value.y !== undefined) {
    return `${name} = POINT(${value.x},${value.y}),`
  }
  return ''
}

// helper function for string
function formatString(str) {
  return nl2nl(addSlashes(str))
}

function nl2nl(str) {
  return (str + '').replace(/([^>\r\n]?)(\r\n|\n\r|\r|\n)/g, '$1' + '\n')
}

function addSlashes(str) {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/\'/g, "\\'")
    .replace(/\"/g, '\\"')
    .replace(/\0/g, '\\0')
}

//helper to throw error if input is null
function checkInsertInput({ data, mapping, tableName }) {
  if (data === null || data === undefined) {
    throw new Error('Unexpected data value null or undefined')
  }
  if (mapping === null || mapping === undefined) {
    throw new Error('Unexpected mapping value null or undefined')
  }
  if (tableName === null || tableName === undefined) {
    throw new Error('Unexpected tableName value null or undefined')
  }
}
