import * as redux from 'redux'
import * as qs from 'query-string'
import fetch from 'node-fetch'


// General discriminant field "status"
// and some additional payload
// which could be an empty object ("{}")
// if you don't need any more additoinal fields.
type DataRequestState
   < I extends Object
   , L extends Object
   , S extends Object
   , F extends Object
   >
   = Idle<I> | Request<L> | Success<S> | Failure<F>

// When we neither have data nor it hasn't been requested yet
type Idle<T extends Object>
   = { readonly [K in keyof T]: T[K] }
   & { readonly status: 'idle' }

// When data is requested and pending to be received
type Request<T extends Object>
   = { readonly [K in keyof T]: T[K] }
   & { readonly status: 'loading' }

// When data is successfully received
type Success<T extends Object>
   = { readonly [K in keyof T]: T[K] }
   & { readonly status: 'success' }

// When request to a server has failed
type Failure<T extends Object>
   = { readonly [K in keyof T]: T[K] }
   & { readonly status: 'failure' }


interface Place
        { placeId: number
        , latitude: number
        , longitude: number
        , displayName: string
        , class: string
        , type: string
        }

interface ReceivedData { places: Place[] }

// Using "ReceivedData" just to show both interface and
// inlined object type are allowed.
type PlaceState =
  DataRequestState < {}
                   , {}
                   , ReceivedData
                   , { message: string }
                   >

type PlaceAction
   = { readonly type: 'PLACE_DATA_REQUEST' }

   | { readonly type: 'PLACE_DATA_SUCCESS'
     , readonly places: Place[]
     }

   | { readonly type: 'PLACE_DATA_FAILURE'
     , readonly message: string
     }

const placeReducer =
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

const ProveExhaustiveness =
  <T extends never>(x: T): void => {}


type CounterState = { readonly counter: number }

type CounterAction
   = { readonly type: 'INCREMENT' }
   | { readonly type: 'DECREMENT' }

const counterReducer =
  ( state: CounterState = { counter: 0 }
  , action: CounterAction
  ): CounterState => {
    switch (action.type) {
      case 'INCREMENT':
        return { counter: state.counter + 1 }
      case 'DECREMENT':
        return { counter: state.counter - 1 }
      default:
        ProveExhaustiveness(action)
        return state
    }
  }


type DispatchableAction = PlaceAction | CounterAction

type Dispatch =
  (action: DispatchableAction) => DispatchableAction


// *** Store creation and triggering actions ***


type StoreState =
  { counter: CounterState
  , place: PlaceState
  }

type StoreMethods =
  { readonly getState: () => StoreState
  , readonly dispatch: Dispatch
  }

type Middleware =
  (store: StoreMethods) => (next: Dispatch) => Dispatch

const topLevelReducers: {
  readonly [K in keyof StoreState]:
    ( state: StoreState[K]
    , action: redux.AnyAction
    ) => StoreState[K]
} = {
  counter: counterReducer,
  place: placeReducer,
}

type Subscribe = (cb: () => void) => redux.Unsubscribe
type Store = StoreMethods & { readonly subscribe: Subscribe }

const loadPlaces = (): Promise<Array<Place>> => {
  const baseUrl =
    'https://nominatim.openstreetmap.org/search/'

  const params =
    { format: 'json'
    , city: 'Helsinki'
    }

  return fetch(`${baseUrl}?${qs.stringify(params)}`)
    .then(x => x.json())
    .then(x => x.map((y: {[K: string]: any}) => (
      { placeId: y.place_id
      , latitude: parseFloat(y.lat)
      , longitude: parseFloat(y.lon)
      , displayName: y.display_name
      , class: y.class
      , types: y.type
      }
    )))
}

const dataRequesterMiddleware: Middleware =
  store => next => action => {
    const state = store.getState()

    console.debug(
      'action received:', action,
      'with previous state:', state,
    )

    if (
      action.type === 'PLACE_DATA_REQUEST' &&
      state.place.status !== 'loading'
    )
      loadPlaces()
        .then(x => store.dispatch(
          { type: 'PLACE_DATA_SUCCESS'
          , places: x
          }
        ))
        .catch(e => store.dispatch(
          { type: 'PLACE_DATA_FAILURE'
          , message: e.toString()
          }
        ))

    return next(action)
  }

const store: Store = redux.createStore(
  redux.combineReducers(topLevelReducers),
  undefined,
  redux.applyMiddleware(dataRequesterMiddleware)
)


console.debug('initial state', store.getState())

store.subscribe(() => {
  console.debug('received new state', store.getState())
})


store.dispatch({ type: 'INCREMENT' })
store.dispatch({ type: 'INCREMENT' })
store.dispatch({ type: 'INCREMENT' })
store.dispatch({ type: 'DECREMENT' })
store.dispatch({ type: 'PLACE_DATA_REQUEST' })


// *** Below goes part of runtime validation ***
//
// TODO implement
