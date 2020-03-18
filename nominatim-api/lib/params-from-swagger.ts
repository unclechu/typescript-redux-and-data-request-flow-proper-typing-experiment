// Parsing Swagger schema and extruding types and values we miss in the code
// produced by "dtsgenerator" library.

import type { Swagger } from './swagger-generic-schema'

import nominatimApiSchema from '../schema.json'

export const schema: Swagger.Schema = (() => {
  const asGenericSchema =
    <T extends Swagger.Schema>(x: T): Swagger.Schema => x

  return asGenericSchema(nominatimApiSchema)
})()

export namespace Types {
  export interface Routes {
    readonly [name: string]: Methods
  }

  export interface Methods {
    readonly [method: string]: MethodParams
  }

  export interface MethodParams {
    readonly path: FieldsDefinition
    readonly query: FieldsDefinition
  }

  export interface FieldsDefinition {
    readonly [name: string]: FieldInfo
  }

  export interface FieldInfo {
    readonly optional: boolean
    readonly type: string
  }
}

const methodToAdd =
  (methodParams: Swagger.RouteMethod):
  Types.MethodParams => {
    const empty: Types.MethodParams = { path: {}, query: {} }

    if (methodParams.parameters === undefined)
      return empty

    const params: Swagger.Parameter[] =
      methodParams.parameters

    return params.reduce((prev, param) => {
      if (param.in !== 'path' && param.in !== 'query')
        return prev

      const name: string = param.name

      const type: string =
        param.schema !== undefined
          ? Helpers.typeResolver(param.schema)
          : Helpers.typeResolver(param)

      const fieldInfo: Types.FieldInfo =
        { optional: !param.required, type }

      switch (param.in) {
        case 'path':
          const path = { ...prev.path, [name]: fieldInfo }
          return { path, query: prev.query }
        case 'query':
          const query = { ...prev.query, [name]: fieldInfo }
          return { path: prev.path, query }
        default:
          return neverHappens(param.in)
      }
    }, empty)
  }

const methodsToAdd =
  (methodMap: Swagger.MethodMap): Types.Methods =>
    Object.entries(methodMap)
      .reduce((result, [methodName, methodParams]) => {
        const methodNamespace =
          Helpers.toNamespace(methodName)

        const method = methodToAdd(methodParams)
        return { ...result, [methodNamespace]: method }
      }, {})

const neverHappens = (x: never): never => {
  throw new Error(`Unreachable case, value: "${x}"`)
}

namespace Helpers {
  export const toNamespace = (x: string): string => x
    .replace(/\/(.)/g, (_, x) => x.toUpperCase())
    .replace(/}/g, '')
    .replace(/{/, '$')
    .replace(/^\//, '')
    .replace(/[^0-9A-Za-z_$]+/g, '_')
    .trim()
    .split('$')
    .map(s => s.replace(
      /(?:^|[^A-Za-z0-9])([A-Za-z0-9]|$)/g,
      (_, x) => x.toUpperCase()
    ))
    .join('$')

  export const definitionRefToType =
    ($ref: string): string =>
      $ref.replace(/^#\/definitions\//g, '')

  export const unexpectedSwaggerParam =
    (param: Swagger.ParamSchema | Swagger.Parameter):
    Error => new Error(
      'Unexpected Swagger parameter: ' +
      `"${JSON.stringify(param)}"`
    )

  export const typeResolver =
    (param: Swagger.ParamSchema): string => {
      if (
        param.type === 'string' &&
        param.enum !== undefined
      ) {

        return param.enum
          .map(x => `'${x.replace(/'/g, "\\'")}'`)
          .join(' | ')

      } else if (param.type !== undefined) {

        if (
          param.type === 'string' ||
          param.type === 'number' ||
          param.type === 'boolean'
        ) {
          return param.type
        } else if (param.type === 'integer') {
          return 'number'
        } else if (
          param.type === 'array' &&
          param.items !== undefined
        ) {
          return typeResolver(param.items) + '[]'
        } else {
          throw Helpers.unexpectedSwaggerParam(param)
        }

      } else if (param.$ref !== undefined) {
        return Helpers.definitionRefToType(param.$ref)
      } else {
        throw Helpers.unexpectedSwaggerParam(param)
      }
    }
}

export const statementsToAdd: Types.Routes =
  Object.entries(schema.paths)
    .reduce((result: Types.Routes, [route, methodMap]) => {
      const routeNamespace = Helpers.toNamespace(route)
      const methods = methodsToAdd(methodMap)
      return { ...result, [routeNamespace]: methods }
    }, {})
