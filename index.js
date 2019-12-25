'use strict'
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

function advancedUpdate({ where, data, mapping, tableName }) {
  checkUpdateInput({ where, data, mapping, tableName })
  const { points, polygons, item } = extractData({ data, mapping })
  return `${mysql.format(
    `UPDATE ${tableName} SET ${joinObjectsToSQL({
      points,
      polygons
    })}? ${advancedWhere({ where, mapping })}`,
    item
  )}`
}

function remove({ where, mapping, tableName }) {
  checkWhereInput({ where, mapping, tableName })
  const { whereItems, whereSQL } = extractWhere({ where, mapping })
  return `${mysql.format(`DELETE FROM ${tableName} ${whereSQL}`, whereItems)}`
}

function advancedRemove({ where, mapping, tableName }) {
  checkWhereInput({ where, mapping, tableName })
  return `DELETE FROM ${tableName} ${advancedWhere({ where, mapping })}`
}

function get({ select, where, mapping, tableName, order, offset }) {
  checkMappingInput({ mapping, tableName })
  checkOrderInput({ order })
  checkLimitOffesetInput({ offset })
  const orderSQL = extractOrder({ order });
  const limitSQL = extractLimit({ offset });
  const sql = `SELECT ${extractSelect({
    select,
    mapping
  })} FROM ${tableName}`
  if (where === undefined || where === null || Object.keys(where) === 0) {
    return sql + `${orderSQL}${limitSQL}`;
  }

  const { whereItems, whereSQL } = extractWhere({ where, mapping })

  return `${mysql.format(`${sql} ${whereSQL}${orderSQL}${limitSQL}`, whereItems)}`
}

function query({ select, where, mapping, tableName, order, offset, count }) {
  checkMappingInput({ mapping, tableName })
  checkOrderInput({ order })
  checkLimitOffesetInput({ offset })
  checkCountInput({ count })

  const sql = `SELECT ${extractSelect({
    select,
    mapping
  })} FROM ${tableName}`
  const orderSQL = extractOrder({ order });
  const limitSQL = extractLimit({ offset });
  const countSQL = extractCount({ count, tableName })
  if (where === undefined || where === null || Object.keys(where) === 0) {
    return sql + ` ${orderSQL}${limitSQL}${countSQL ? ';' + countSQL : ''}`
  }
  const whereSQL = advancedWhere({ where, mapping })
  return `${sql} ${whereSQL}${orderSQL}${limitSQL}${countSQL ? ';' + countSQL + whereSQL : ''}`
}

function _count({ as, where, mapping, tableName }) {
  checkMappingInput({ mapping, tableName })
  checkCountInput({ count: as })

  const sql = extractCount({ count: as, tableName })
  if (where === undefined || where === null || Object.keys(where) === 0) {
    return sql
  }
  const whereSQL = advancedWhere({ where, mapping })
  return `${sql}${whereSQL}`
}

module.exports = {
  insert,
  replace,
  update,
  advancedUpdate,
  delete: remove,
  advancedRemove,
  advancedDelete: advancedRemove,
  remove,
  get: get,
  query,
  count: _count
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

function advancedWhere({ where, mapping }) {
  const noAnd =
    where.and === undefined ||
    where.and === null ||
    Object.keys(where.and) === 0
  const noOr =
    where.or === undefined || where.or === null || Object.keys(where.or) === 0

  if (noAnd && noOr) {
    throw new Error(`'and' value or 'or' value required`)
  }
  let andSql = '',
    orSql = ''
  if (!noAnd) {
    andSql = getValues({ where: where.and, mapping }).join(' AND ')
  }
  if (!noOr) {
    orSql = `${!noAnd ? ' OR ' : ''}${getValues({
      where: where.or,
      mapping
    }).join(' OR ')}`
  }

  const whereSQL = andSql + orSql
  return whereSQL ? `WHERE ${whereSQL}` : ''
}

function isObject(val) {
  return val instanceof String ||
    val instanceof Number ||
    val instanceof Date ||
    typeof val === 'number' ||
    typeof val === 'string'
    ? false
    : true
}

function extractValue({ val, name, mapping }) {
  return Object.entries(val).reduce((o, [key, value]) => {
    switch (key) {
      case '>':
        o.push(
          mysql.format(`?? > ?`, [name, matchMapping({ value, name, mapping })])
        )
        break
      case '<':
        o.push(
          mysql.format(`?? < ?`, [name, matchMapping({ value, name, mapping })])
        )
        break
      case '>=':
        o.push(
          mysql.format(`?? >= ?`, [
            name,
            matchMapping({ value, name, mapping })
          ])
        )
        break
      case '<=':
        o.push(
          mysql.format(`?? <= ?`, [
            name,
            matchMapping({ value, name, mapping })
          ])
        )
        break
      case 'in':
      case 'not in': {
        if (!Array.isArray(value)) {
          throw new Error(`Invalid value ${[name]} : ${value} in where object`)
        }
        const values = value.filter((v) =>
          matchMapping({ value: v, name, mapping })
        )
        o.push(
          mysql.format(
            `?? ${key.toUpperCase()}(${values.map(() => '?').join(',')})`,
            [name].concat(values)
          )
        )
        break
      }

      default:
        break
    }
    return o
  }, [])
}

function getValues({ where, mapping }) {
  return Object.entries(where).reduce((o, [nm, val]) => {
    if (mapping[nm] !== undefined && val !== undefined && val !== null) {
      if (isObject(val)) {
        return o.concat(extractValue({ val, name: nm, mapping }))
      }
      return o.concat(
        mysql.format(`?? = ?`, [
          nm,
          matchMapping({ value: val, name: nm, mapping })
        ])
      )
    }
    return o
  }, [])
}

function extractOrder({ order }) {
  if (order === undefined || order === null) {
    return '';
  }
  let str = ''
  const { by, sort } = order
  if (by === undefined || by === null) {
    return '';
  }
  str += mysql.format(` ORDER BY ?? `, [by])
  if (sort === undefined || sort === null) {
    return str
  }
  return str + sort;
}

function extractLimit({ offset }) {
  if (offset === null || offset === undefined || !Array.isArray(offset) || offset.length !== 2) {
    return ''
  }
  const [index, limit] = offset
  const parsedIndex = parseInt(index, 10)
  const parsedLimit = parseInt(limit, 10)
  if (isNaN(parsedIndex) || isNaN(parsedLimit)) {
    return ''
  }
  return ` LIMIT ${parsedIndex}, ${parsedLimit}`;

}

function extractCount({ count, tableName }) {
  if (count === null || count === undefined) {
    return ''
  }

  return mysql.format(`SELECT COUNT(*) AS ?? FROM ${tableName} `, [count]);
}

function matchMapping({ value, name, mapping }) {
  if (mapping[name] !== undefined && value !== undefined && value !== null) {
    switch (mapping[name]) {
      case 'string':
        if (typeof value === 'string' || value instanceof String) {
          return value
        }
        break
      case 'number':
        if (typeof value === 'number' || value instanceof Number) {
          return value
        }
        break
      case 'datetime':
        if (typeof value === 'string' || value instanceof Date) {
          return value
        }
        break
      default:
        throw new Error(`Invalid value ${[name]} : ${value} in where object`)
    }
  }
  throw new Error(`Invalid value ${[name]} : ${value} in where object`)
}

function extractSelect({ select, mapping }) {
  if (select === undefined || select === null || !Array.isArray(select)) {
    return '*'
  }
  const selection = select.filter((name) => mapping[name] !== undefined)
  if (selection.length === 0) {
    return '*'
  }
  return mysql.format(`${selection.map(() => `??`).join(', ')}`, selection)
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
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
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
  if (data === null || data === undefined) {
    throw new Error('Unexpected data value null or undefined')
  }
  checkWhereInput({ where, mapping, tableName })
}

//helper to throw error if input is null on where
function checkWhereInput({ where, mapping, tableName }) {
  if (where === null || where === undefined) {
    throw new Error('Unexpected where value null or undefined')
  }
  checkMappingInput({ mapping, tableName })
}

function checkMappingInput({ mapping, tableName }) {
  if (mapping === null || mapping === undefined) {
    throw new Error('Unexpected mapping value null or undefined')
  }
  if (tableName === null || tableName === undefined) {
    throw new Error('Unexpected tableName value null or undefined')
  }
}

//helper to throw error if limit and offset whether they are not undefined, null nor number
function checkOrderInput({ order }) {
  if (order !== null && order !== undefined && typeof order !== 'object') {
    const { by, sort } = order
    if (by !== null && by !== undefined && typeof by !== 'string') {
      throw new Error('Unexpected orderBy value, has to be string or empty')
    }
    if (sort !== null && sort !== undefined && (sort.toUpperCase() !== 'DESC' && sort.toUpperCase() !== 'ASC')) {
      throw new Error('Unexpected order value, has to be string (ASC, DESC) or empty')
    }
  }

}

function checkLimitOffesetInput({ offset }) {
  if (offset !== null && offset !== undefined) {
    if (!Array.isArray(offset)) {
      throw new Error('Unexpected offset value has to be an array')
    }
    if (offset.length !== 2) {
      throw new Error('Unexpected offset value has to be an array of [index,limit]')
    }
    const [index, limit] = offset
    if (index !== null && index !== undefined && typeof index !== 'number') {
      throw new Error('Unexpected index value has to be number')
    }

    if (limit !== null && limit !== undefined && typeof limit !== 'number') {
      throw new Error('Unexpected limit value has to be number')
    }
  }
}

function checkCountInput({ count }) {
  if (count !== null && count !== undefined) {
    if (typeof count !== 'string' && !(count instanceof String)) {
      throw new Error('Unexpected count value has to be string')
    }
    if (count.trim().length === 0) {
      throw new Error('Unexpected count value')
    }
  }
}