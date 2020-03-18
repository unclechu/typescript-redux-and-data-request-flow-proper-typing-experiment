import { writeFileSync } from 'fs'
import { join, relative, basename } from 'path'
import { inspect } from 'util'

import * as ts from 'typescript'

// Swagger to TypeScript types generator
import dtsGenerator from 'dtsgenerator'

import * as FromSwagger from './lib/params-from-swagger'
import { Exceptions, patchGeneratedTypes } from './lib/extend-params-namespace'

namespace ExportFile {
  export const apiFileName = `${basename(__dirname)}.ts`

  export const apiFilePath = relative(
    process.cwd(),
    join(__dirname, '..', 'src', apiFileName)
  )
}

namespace TS {
  export const getAstTreeFromTypeScriptCode =
    (src: string): ts.SourceFile => ts.createSourceFile(
      ExportFile.apiFileName,
      src,
      ts.ScriptTarget.ES2015,
      true,
      ts.ScriptKind.TS
    )
}

dtsGenerator({ contents: [FromSwagger.schema] })
  .then(TS.getAstTreeFromTypeScriptCode)
  .then(dtsAst => ({
    dtsAst,
    patchedAst: patchGeneratedTypes(FromSwagger.statementsToAdd, dtsAst)
  }))
  .then(({ dtsAst, patchedAst }) => {
    const { printFile } = ts.createPrinter()

    return {
      dtsCode: printFile(dtsAst),
      patchedCode: printFile(patchedAst),
    }
  })
  .then(code => {
    console.debug('// Original generated types:\n')
    console.debug(code.dtsCode)
    console.debug('// Patched code:\n')
    console.debug(code.patchedCode)
    writeFileSync(ExportFile.apiFilePath, code.patchedCode)
    console.debug('// Saved to', ExportFile.apiFilePath)
  })
  .catch(err => {
    if (
      err instanceof Exceptions.SomeRouteStatementsLeftUnhandled ||
      err instanceof Exceptions.SomeMethodStatementsLeftUnhandled
    ) {
      console.error(
        `${err.getMessage()}:`,
        inspect(err.statements, { colors: true, depth: 4 })
      )
    } else {
      console.error(err)
    }

    process.exit(1)
  })
