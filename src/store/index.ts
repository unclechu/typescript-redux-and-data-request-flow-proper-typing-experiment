import { createStore, combineReducers, applyMiddleware } from 'redux'

import { Store, StoreMiddleware } from './types'
import storeHandler from './handlers'
import storeReducer from './reducers'

const handlerMiddleware: StoreMiddleware =
  store => next => action => {
    const state = store.getState()

    console.debug(
      'action received:', action,
      'with previous state:', state,
    )

    storeHandler(store, action)
    return next(action)
  }

const store: Store = createStore(
  storeReducer,
  undefined,
  applyMiddleware(handlerMiddleware)
)

export default store
