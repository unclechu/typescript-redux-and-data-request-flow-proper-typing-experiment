import type { PlaceState, PlaceAction } from './types'
import { ProveExhaustiveness } from '../../generic-utils'

export const placeReducer =
  ( state: PlaceState = { status: 'idle' }
  , action: PlaceAction,
  ): PlaceState => {
    switch (action.type) {
      case 'PLACE_DATA_REQUEST':
        return { status: 'loading' }
      case 'PLACE_DATA_SUCCESS':
        return { status: 'success', places: action.places }
      case 'PLACE_DATA_FAILURE':
        return { status: 'failure', message: action.message }
      default:
        // Proove in compile-time that all patterns are
        // exhaustive for all actions belonging to this
        // reducer.
        //
        // Also could be written as
        // (but it's less obvious what's going on):
        //   const _: never = action
        //
        ProveExhaustiveness(action)

        // In the runtime different type of action is
        // absolutely possible since Redux sends actions to
        // all reducers.
        return state
    }
  }

export default placeReducer
