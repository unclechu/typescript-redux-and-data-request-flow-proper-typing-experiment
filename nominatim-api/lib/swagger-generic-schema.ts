export namespace Swagger {
  export interface Schema {
    readonly swagger: string
    readonly definitions: DefinitionMap
    readonly paths: RouteMap
  }

  export interface DefinitionMap {
    readonly [name: string]: Definition
  }

  export interface Definition {
    readonly type: string
    readonly required?: string[]
    readonly properties?: Props
  }

  export interface Props {
    readonly [propName: string]: ParamSchema
  }

  export interface RouteMap {
    readonly [route: string]: MethodMap
  }

  export interface MethodMap {
    readonly [method: string]: RouteMethod
  }

  export interface RouteMethod {
    readonly parameters?: Parameter[]
    readonly produces?: string[]
    readonly consumes?: string[]
    readonly responses: ResponseMap
  }

  export type Parameter = {
    readonly required: boolean
    readonly in: string
    readonly name: string
    readonly schema?: ParamSchema
  } & ParamSchema

  export interface ResponseMap {
    readonly [statusCode: string]: Response
  }

  export type Response =
    ParamSchema & { readonly description?: string }

  export interface ParamSchema {
    readonly $ref?: string
    readonly type?: string
    readonly items?: ParamSchema
    readonly enum?: string[]
  }
}
