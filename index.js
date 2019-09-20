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
    location: 'point' //  x , y for geolocation lng , lat,
    borders: 'polygon'
  }
  tableName = 'test_name'

 */
module.exports = {
  insert: ({ data, mapping, tableName }) => {
    checkInsertInput({ data, mapping, tableName })
    const points = []
    const polygons = []
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
            points.push(
              extractPoint({ name: nm, value: val, wrapper: pointWrapper })
            )
            break
          case 'polygon':
            polygons.push(extractPolygon({ name: nm, value: val }))
            break
        }
      }
      return o
    }, {})
    return `${mysql.format(
      `INSERT INTO ${tableName} SET ${joinObjectsToSQL({ points, polygons })}?`,
      item
    )}`
  }
}

function joinObjectsToSQL({ points, polygons }) {
  const sqlArr = []
  if (points.length > 0) {
    sqlArr.push(points.join(','))
  }
  if (polygons.length > 0) {
    sqlArr.push(polygons.join(','))
  }
  return sqlArr.join(',')
}

//helper function for location
function extractPoint({ name, value, wrapper }) {
  if (value === undefined || value === null) {
    return ''
  }
  if (value.x !== undefined && value.y !== undefined) {
    const x = parseFloat(value.x)
    if (isNaN(x)) {
      throw new Error(`Invalid X value of ${name}: ${value.x}`)
    }
    const y = parseFloat(value.y)
    if (isNaN(y)) {
      throw new Error(`Invalid Y value of ${name}: ${value.y}`)
    }
    return wrapper({ name, x, y })
  }
  return ''
}

function pointWrapper({ name, x, y }) {
  return `${name} = POINT(${x},${y}),`
}

function ploygonPointWrapper({ x, y }) {
  return `${x}  ${y}`
}

function extractPolygon({ name, value }) {
  // value is [{lat,lng},....]
  if (value === undefined || value === null) {
    return ''
  }

  if (!Array.isArray(value)) {
    throw new Error(`Invalid Ploygon value of ${name}`)
  }
  const points = value.map((value, i) =>
    extractPoint({
      name: `${name}[${i}]`,
      value,
      wrapper: ploygonPointWrapper
    })
  )
  return `${name} = ST_GeomFromText('POLYGON(${points.join(',')})'),`
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
