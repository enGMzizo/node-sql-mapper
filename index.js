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

function get({ select, where, mapping, tableName, orderBy, order, offset,  limit}) {
  checkMappingInput({ mapping, tableName })
  checkOrderInput({ orderBy, order, offset, limit})
  const orderSQL = extractOrder({ orderBy, order });
  const limitSQL = extractLimit({ offset, limit });
  const sql = `SELECT ${extractSelect({
    select,
    mapping
  })} FROM ${tableName}`
  if (where === undefined || where === null || Object.keys(where) === 0) {
    return sql + ` ${orderSQL} ${limitSQL}`;
  }

  const { whereItems, whereSQL } = extractWhere({ where, mapping })

  return `${mysql.format(`${sql} ${whereSQL} ${orderSQL} ${limitSQL}`, whereItems)}`
}

function query({ select, where, mapping, tableName, orderBy, order, offset, limit }) {
  checkMappingInput({ mapping, tableName })
  checkOrderInput({ orderBy, order, offset, limit })
  const sql = `SELECT ${extractSelect({
    select,
    mapping
  })} FROM ${tableName}`
  const orderSQL = extractOrder({ orderBy, order });
  const limitSQL = extractLimit({ offset, limit });
  if (where === undefined || where === null || Object.keys(where) === 0) {
    return sql + ` ${orderSQL} ${limitSQL}`
  }
  return `${sql} ${advancedWhere({ where, mapping })} ${orderSQL} ${limitSQL}`
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
  query
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

function extractOrder({ orderBy, order }) {
  if (orderBy === undefined || orderBy === null) {
    return '';
  }
  if (order === undefined || order === null) {
    order = 'DESC';
  }
  return mysql.format(`ORDER BY ? ?`, [orderBy, order]);
}

function extractLimit({offset, limit}){
  if( offset === undefined || offset === null)
    offset = 0;
  if( limit === undefined || limit === null)
    limit = 50;
  return `LIMIT ${offset}, ${limit}`;
  
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
function checkOrderInput({ orderBy, order, offset, limit}) {
  if (orderBy !== null && orderBy !== undefined && typeof orderBy !== 'string') {
    throw new Error('Unexpected orderBy value, has to be string or empty')
  }
  if (order !== null && order !== undefined && ( order.toUpperCase() !== 'DESC' || order.toUpperCase() !== 'ASC') ) {
    throw new Error('Unexpected order value, has to be string (ASC, DESC) or empty')
  }
  checkLimitOffesetInput({offset, limit});

}
function checkLimitOffesetInput({offset, limit}){
  if (limit !== null && limit !== undefined && typeof limit !== 'number') {
    throw new Error('Unexpected limit value has to be number or empty')
  }
  if (offset !== null && offset !== undefined && typeof offset !== 'number') {
    throw new Error('Unexpected offset value has to be number or empty')
  }
}