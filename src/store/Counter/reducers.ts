import type { CounterState, CounterAction } from './types'
import { ProveExhaustiveness } from '../../generic-utils'

const counterReducer =
  ( state: CounterState = { counter: 0 }
  , action: CounterAction
  ): CounterState => {
    switch (action.type) {
      case 'COUNTER_INCREMENT':
        return { counter: state.counter + 1 }
      case 'COUNTER_DECREMENT':
        return { counter: state.counter - 1 }
      default:
        ProveExhaustiveness(action)
        return state
    }
  }

export default counterReducer
