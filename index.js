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

function insert({ data, mapping, tableName, action = 'INSERT' }) {
  checkInsertInput({ data, mapping, tableName })
  const { points, polygons, item } = extractData({ data, mapping })
  return `${mysql.format(
    `${action} INTO ${tableName} SET ${joinObjectsToSQL({
      points,
      polygons
    })}?`,
    item
  )}`
}

function replace(params) {
  return insert({ ...params, action: 'REPLACE' })
}

function update({ where, data, mapping, tableName }) {
  checkUpdateInput({ where, data, mapping, tableName })
  const { whereItems, whereSQL } = extractWhere({ where, mapping })
  const { points, polygons, item } = extractData({ data, mapping })
  return `${mysql.format(
    `UPDATE ${tableName} SET ${joinObjectsToSQL({
      points,
      polygons
    })}? ${whereSQL}`,
    [].concat(item, whereItems)
  )}`
}

function remove({ where, mapping, tableName }) {
  checkWhereInput({ where, mapping, tableName })
  const { whereItems, whereSQL } = extractWhere({ where, mapping })
  return `${mysql.format(`DELETE FROM ${tableName} ${whereSQL}`, whereItems)}`
}

function get({ select, where, mapping, tableName }) {
  checkWhereInput({ where, mapping, tableName })
  const { whereItems, whereSQL } = extractWhere({ where, mapping })

  return `${mysql.format(
    `SELECT ${extractSelect({
      select,
      mapping
    })} FROM ${tableName} ${whereSQL}`,
    whereItems
  )}`
}

module.exports = {
  insert,
  replace,
  update,
  delete: remove,
  remove,
  get: get
}

function extractWhere({ where, mapping }) {
  const whereItems = Object.entries(where).reduce((o, [nm, val]) => {
    if (mapping[nm] !== undefined && val !== undefined && val !== null) {
      switch (mapping[nm]) {
        case 'string':
          if (typeof val === 'string' || val instanceof String) {
            o.push({
              [nm]: formatString(val.toString())
            })
          }
          break
        case 'number':
          if (typeof val === 'number' || val instanceof Number) {
            o.push({
              [nm]: val
            })
          }
          break
        case 'datetime':
          if (typeof val === 'string' || val instanceof Date) {
            o.push({
              [nm]: val
            })
          }
          break
        default:
          throw new Error(`Invalid value ${[nm]} : ${val} in where object`)
      }
    } else {
      throw new Error(`Invalid value ${[nm]} : ${val} in where object`)
    }
    return o
  }, [])
  return {
    whereItems,
    whereSQL:
      whereItems.length > 0
        ? `WHERE ${whereItems.map(() => '?').join(' AND ')}`
        : ''
  }
}

function extractSelect({ select, mapping }) {
  if (select === undefined || select === null || !Array.isArray(select)) {
    return '*'
  }
  const selection = select.filter((name) => mapping[name] !== undefined)
  if (selection.length === 0) {
    return '*'
  }
  return mysql.format(`${selection.map(() => `?`).join(', ')}`, selection)
}

function extractData({ data, mapping }) {
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
  return {
    item,
    points,
    polygons
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
//helper to throw error if input is null
function checkUpdateInput({ where, data, mapping, tableName }) {
  if (where === null || where === undefined) {
    throw new Error('Unexpected where value null or undefined')
  }
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
//helper to throw error if input is null on where
function checkWhereInput({ where, mapping, tableName }) {
  if (where === null || where === undefined) {
    throw new Error('Unexpected where value null or undefined')
  }
  if (mapping === null || mapping === undefined) {
    throw new Error('Unexpected mapping value null or undefined')
  }
  if (tableName === null || tableName === undefined) {
    throw new Error('Unexpected tableName value null or undefined')
  }
}
