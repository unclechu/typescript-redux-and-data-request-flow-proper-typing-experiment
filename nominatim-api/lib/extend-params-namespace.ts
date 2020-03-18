// Extending AST with types and values missed in the code produced by
// "dtsgenerator" library. With types and values previously parsed from a
// Swagger schema.

import * as ts from 'typescript'

import * as FromSwagger from './params-from-swagger'

type NamespaceStatement = ts.ModuleDeclaration & { name: ts.Identifier }
type NamespaceWithBody = NamespaceStatement & { body: ts.ModuleBlock }
type ParametersHaveBeenAdded = boolean

interface AST<S> {
  readonly ast: ts.Statement
  readonly toAdd: S
}

const parametersNamespaceName = 'Parameters'

// To "Parameters" namespace
const addParams =
  ( statement: NamespaceStatement
  , methodParams: FromSwagger.Types.MethodParams
  ): NamespaceWithBody => {
    const x = Utils.asNamespaceWithBody(ts.getMutableClone(statement))

    const renderInterface =
      ( name: string
      , fieldsDefinition: FromSwagger.Types.FieldsDefinition
      ): void => {
        if (Object.keys(fieldsDefinition).length > 0)
          x.body.statements = ts.createNodeArray([
            ...x.body.statements,
            Utils.renderFieldsInterface(name, fieldsDefinition),
          ])
      }

    renderInterface('Path', methodParams.path)
    renderInterface('Query', methodParams.query)
    return x
  }

// "BodyParameters", "Parameters", "Responses"
const mapGroupNamespace =
  ( statement: ts.Statement
  , methodParams: FromSwagger.Types.MethodParams
  ): [ParametersHaveBeenAdded, ts.Statement] => {
    if (
      !Utils.statementIsNamespace(statement) ||
      !(
        statement.name.escapedText === 'Responses' ||
        statement.name.escapedText === parametersNamespaceName
      )
    )
      return [false, statement]

    const ast = ts.getMutableClone(statement)
    ast.modifiers = Utils.addExportToModifiers(ast.modifiers)

    const isParametersNamespace =
      Boolean(ast.name.escapedText === parametersNamespaceName)

    return [
      isParametersNamespace,
      isParametersNamespace ? addParams(ast, methodParams) : ast
    ]
  }

// "Get", "Post"
const mapMethodNamespace =
  (x: AST<FromSwagger.Types.Methods>):
  AST<FromSwagger.Types.Methods> => {
    if (!ts.isModuleDeclaration(x.ast)) return x
    const ast = ts.getMutableClone(x.ast)
    ast.modifiers = Utils.addExportToModifiers(ast.modifiers)

    // Jump up to "body" and then to parent namespace
    // of a method, and then again jump over "body" to
    // "Paths" namespace.
    const topParent: ts.Node = ast.parent.parent.parent.parent

    const foundToAdd =
      Utils.isRoutesNamespace(topParent) &&
      ts.isIdentifier(ast.name)
        ? Utils.splitObjectEntry(ast.name.escapedText as string, x.toAdd)
        : null

    const body =
      ast.body !== undefined && ts.isModuleBlock(ast.body)
        ? ts.getMutableClone(ast.body)
        : ts.createModuleBlock([])

    const emptyMethodParams: FromSwagger.Types.MethodParams =
      { path: {}, query: {} }

    const { newStatements, parametersHaveBeenAdded } =
      body.statements.reduce(
        ({ newStatements, parametersHaveBeenAdded }, group) => {
          const [parametersAreJustAdded, newStatement] =
            mapGroupNamespace(
              group,
              parametersHaveBeenAdded || foundToAdd === null
                ? emptyMethodParams
                : foundToAdd.entry[1]
            )

          return {
            newStatements: [...newStatements, newStatement],
            parametersHaveBeenAdded:
              parametersHaveBeenAdded || parametersAreJustAdded,
          }
        },
        {
          newStatements: [] as ts.Statement[],
          parametersHaveBeenAdded: false,
        }
      )

    body.statements = ts.createNodeArray(newStatements)

    if (foundToAdd !== null && !parametersHaveBeenAdded) {
      const newParametersNamespace: NamespaceWithBody =
        addParams(ts.createModuleDeclaration(
          [],
          [ts.createModifier(ts.SyntaxKind.ExportKeyword)],
          ts.createIdentifier(parametersNamespaceName),
          undefined
        ) as NamespaceStatement, (foundToAdd as any).entry[1])

      newParametersNamespace.flags = ts.NodeFlags.Namespace

      body.statements = ts.createNodeArray([
        ...body.statements,
        newParametersNamespace,
      ])
    }

    ast.body = body
    return { ast, toAdd: foundToAdd !== null ? foundToAdd.rest : x.toAdd }
  }

// Name of a namespace comes from route mask.
// "/search" becomes "Search".
// "/search/{query}" becomes "Search$Query".
// "/test6/foo/{bar}/baz/bzz/{zzz}/aaa" becomes
// "Test6Foo$BarBazBzzZzzAaa".
// See "dtsgenerator" library.
const mapEndpointNamespace =
  (x: AST<FromSwagger.Types.Routes>):
  AST<FromSwagger.Types.Routes> => {
    if (!ts.isModuleDeclaration(x.ast)) return x
    const ast = ts.getMutableClone(x.ast)
    ast.modifiers = Utils.addExportToModifiers(ast.modifiers)

    // Jump up to "body" and then to parent namespace
    const topParent: ts.Node = ast.parent.parent

    const foundToAdd =
      Utils.isRoutesNamespace(topParent) &&
      ts.isIdentifier(ast.name)
        ? Utils.splitObjectEntry(ast.name.escapedText as string, x.toAdd)
        : null

    if (ast.body === undefined || !ts.isModuleBlock(ast.body)) {
      if (foundToAdd !== null) {
        const methods: FromSwagger.Types.Methods = foundToAdd.entry[1]

        if (Object.keys(methods).length > 0)
          throw new Exceptions.SomeMethodStatementsLeftUnhandled(
            foundToAdd.entry[0],
            methods
          )
      }

      return { ast, toAdd: x.toAdd }
    }

    const body = ts.getMutableClone(ast.body)

    const { newStatements, leftToAdd } =
      body.statements.reduce(
        ({ newStatements, leftToAdd }, method) => {
          const result = mapMethodNamespace({
            ast: method,
            toAdd: leftToAdd,
          })

          return {
            newStatements: [...newStatements, result.ast],
            leftToAdd: result.toAdd,
          }
        },
        {
          newStatements: [] as ts.Statement[],
          leftToAdd: foundToAdd === null ? {} : foundToAdd.entry[1],
        }
      )

    if (foundToAdd !== null) {
      const methods: FromSwagger.Types.Methods = leftToAdd

      if (Object.keys(methods).length > 0)
        throw new Exceptions.SomeMethodStatementsLeftUnhandled(
          foundToAdd.entry[0],
          methods
        )
    }

    body.statements = ts.createNodeArray(newStatements)
    ast.body = body
    return { ast, toAdd: foundToAdd !== null ? foundToAdd.rest : x.toAdd }
  }

// "Definitions", "Paths"
const mapRootNamespace =
  (x: AST<FromSwagger.Types.Routes>):
  AST<FromSwagger.Types.Routes> => {
    if (!ts.isModuleDeclaration(x.ast)) return x
    const ast = ts.getMutableClone(x.ast)
    ast.modifiers = Utils.addExportToModifiers(ast.modifiers)

    if (ast.body === undefined || !ts.isModuleBlock(ast.body))
      return { ast, toAdd: x.toAdd }

    // shallow clone of the "body"
    const body = ts.getMutableClone(ast.body)

    const { newStatements, leftToAdd } =
      body.statements.reduce(
        ({ newStatements, leftToAdd }, statement) => {
          const result =
            mapEndpointNamespace({
               ast: statement,
               toAdd: leftToAdd,
            })

          return {
            newStatements: [...newStatements, result.ast],
            leftToAdd: result.toAdd,
          }
        },
        {
          newStatements: [] as ts.Statement[],
          leftToAdd: x.toAdd,
        }
      )

    body.statements = ts.createNodeArray(newStatements)
    ast.body = body
    return { ast, toAdd: leftToAdd }
  }

export const patchGeneratedTypes =
  ( statementsToAdd: FromSwagger.Types.Routes
  , srcAst: ts.SourceFile
  ): ts.SourceFile => {
    // shallow clone
    const ast = ts.getMutableClone(srcAst)

    const { newStatements, leftToAdd } =
      ast.statements.reduce(
        ({ newStatements, leftToAdd }, statement) => {
          const result = mapRootNamespace({
            ast: statement,
            toAdd: leftToAdd,
          })

          return {
            newStatements: [...newStatements, result.ast],
            leftToAdd: result.toAdd,
          }
        },
        {
          newStatements: [] as ts.Statement[],
          leftToAdd: statementsToAdd,
        }
      )

    ast.statements = ts.createNodeArray(newStatements)

    if (Object.keys(leftToAdd).length > 0)
      throw new Exceptions.SomeRouteStatementsLeftUnhandled(leftToAdd)

    return ast
  }

export namespace Exceptions {
  export class SomeRouteStatementsLeftUnhandled extends Error {
    public statements: FromSwagger.Types.Routes

    private static readonly comment =
      'see "statements" property of this exception'

    private static readonly message =
      'Some route statements left unhandled'

    public getMessage(): string {
      return SomeRouteStatementsLeftUnhandled.message
    }

    constructor(statements: FromSwagger.Types.Routes) {
      const c = SomeRouteStatementsLeftUnhandled
      super(`${c.message} (${c.comment})`)
      this.statements = statements
    }
  }

  export class SomeMethodStatementsLeftUnhandled extends Error {
    public route: string
    public statements: FromSwagger.Types.Methods

    private static readonly comment =
      'see "statements" property of this exception'

    private static readonly getMessage =
      (route: string): string =>
        `Some method statements of "${route}" route ` +
        'left unhandled'

    public getMessage(): string {
      const c = SomeMethodStatementsLeftUnhandled
      return c.getMessage(this.route)
    }

    constructor(route: string, statements: FromSwagger.Types.Methods) {
      const c = SomeMethodStatementsLeftUnhandled
      super(`${c.getMessage(route)} (${c.comment})`)
      this.route = route
      this.statements = statements
    }
  }
}

namespace Utils {
  // If a specified key found in a provided object
  // it returns a pair of that key and found value,
  // and also object which is a clone of object you
  // provide but without that found element.
  // If an element not found by specified key
  // it returns just "null".
  export const splitObjectEntry =
    <V>(k: string, obj: { readonly [k: string]: V }): {
      readonly entry: [string, V]
      readonly rest: { readonly [k: string]: V }
    } | null => {
      if (obj[k] === undefined) return null

      return {
        entry: [k, obj[k]],
        rest: Object.keys(obj).reduce(
          (result, objK) => (
            objK === k ? result : { ...result, [objK]: obj[objK] }
          ),
          {}
        )
      }
    }

  // Add "export" modifier to make a statement being
  // exported.
  export const addExportToModifiers =
    (mods?: ts.ModifiersArray): ts.ModifiersArray =>
      ts.createNodeArray(
        (mods ?? []).filter(
          x => x.kind !== ts.SyntaxKind.DeclareKeyword
        ).concat(
          ts.createModifier(ts.SyntaxKind.ExportKeyword)
        )
      )

  export const isRoutesNamespace =
    (x: ts.Node): boolean => Boolean(
      ts.isModuleDeclaration(x) &&
      ts.isIdentifier(x.name) &&
      x.name.escapedText === 'Paths'
    )

  export const statementIsNamespace =
    (x: ts.Statement): x is NamespaceStatement =>
      ts.isModuleDeclaration(x) && ts.isIdentifier(x.name)

  // Returns a clone with also cloned "body" field
  export const asNamespaceWithBody =
    (x: NamespaceStatement): NamespaceWithBody => {
      const s: typeof x = ts.getMutableClone(x)

      const body: ts.ModuleBlock =
        x.body !== undefined && ts.isModuleBlock(x.body)
          ? ts.getMutableClone(x.body)
          : ts.createModuleBlock([])

      s.body = body
      return s as NamespaceWithBody
    }

  const renderFieldName = (name: string): string =>
    /[^0-9A-Za-z_$]/.test(name) || /^\d/.test(name)
      ? `"${name}"`
      : name

  export const renderInterfaceProp =
    ( name: string
    , { optional, type }: FromSwagger.Types.FieldInfo
    ): ts.PropertySignature => ts.createPropertySignature(
      [],

      // There might be some AST-level wrapper into quotes
      renderFieldName(name),

      optional ? ts.createToken(ts.SyntaxKind.QuestionToken) : undefined,

      // Hacking for raw TypeScript code.
      // Anyway, I don't know how to properly create "ts.TypeNode".
      ts.createIdentifier(type) as any,

      undefined
    )

  export const renderFieldsInterface =
    ( interfaceName: string
    , fieldsDefinition: FromSwagger.Types.FieldsDefinition
    ): ts.InterfaceDeclaration => ts.createInterfaceDeclaration(
      [],
      [ts.createModifier(ts.SyntaxKind.ExportKeyword)],
      interfaceName,
      [],
      [],
      Object.entries(fieldsDefinition)
        .map(([k, v]) => renderInterfaceProp(k, v))
    )
}
