import type { AnyAction, Unsubscribe } from 'redux'

import type { PlaceAction, PlaceState } from './Place/types'
import type { CounterAction, CounterState } from './Counter/types'

export type DispatchableAction = PlaceAction | CounterAction

export type Dispatch =
  (action: DispatchableAction) => DispatchableAction

export type Subscribe = (cb: () => void) => Unsubscribe

export type StoreState = {
  readonly counter: CounterState
  readonly place: PlaceState
}

export type StoreMethods = {
  readonly getState: () => StoreState
  readonly dispatch: Dispatch
}

export type Store =
  StoreMethods & {
    readonly subscribe: Subscribe
  }

export type StoreMiddleware =
  (store: StoreMethods) => (next: Dispatch) => Dispatch

// Helps for compile-time proofs when defining store
// branches using "combineReducers".
//
// "T" type variable would be "StoreState" for instance.
//
// So with this helper you get a compile-time check that you
// provided all store branches according to store branch
// state type with correct reducer for each branch.
export type StoreCombinedReducers<T> = {
  readonly [K in keyof T]:
    (state: T[K], action: AnyAction) => T[K]
}

export type StoreHandler =
  (store: StoreMethods, action: DispatchableAction) => void
