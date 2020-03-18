/**
 * Prove on type-level that a value is exhausted
 * (for instance switch-case patterns are covered all
 * possible values) but allow continuation in runtime.
 *
 * Good application of such helper is scoped actions for
 * Redux store, you define discriminated union type of
 * action related to particular reducer (store branch)
 * and check inside a reducer that you handle every action
 * related to that reducer. So you would check in
 * compile-time that you neither don't have "dead"/unused
 * actions nor you din't forget to add action handler. Also
 * you wouldn't handle incorrect action type. But Redux
 * sends any triggered action to all the reducers defined
 * for a store, so while in compile-time we checked that all
 * actions covered by your code in runtime we just return
 * original reducer state without any changes if we get an
 * action outside of scope of our reducer.
 */
export const ProveExhaustiveness =
  <T extends never>(x: T): void => {}

/**
 * Also known as "AssertNever".
 *
 * Proves on compile-time that a case is unreachable and in
 * runtime throws an exception.
 */
export const ImpossibleCase =
  <T extends never>(x: T): never => {
    throw new Error(`Unexpected case, value: "${x}"`)
  }
