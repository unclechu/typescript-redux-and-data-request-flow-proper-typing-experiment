import { combineReducers } from 'redux'

import type { StoreState, StoreCombinedReducers } from './types'

import counterReducer from './Counter/reducers'
import placeReducer from './Place/reducers'

const topLevelReducer: StoreCombinedReducers<StoreState> = {
  counter: counterReducer,
  place: placeReducer,
}

export default combineReducers(topLevelReducer)
