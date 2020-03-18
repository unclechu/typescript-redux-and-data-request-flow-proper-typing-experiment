export interface CounterState {
  readonly counter: number
}

export type CounterAction =
  | { readonly type: 'COUNTER_INCREMENT' }
  | { readonly type: 'COUNTER_DECREMENT' }
