import type { StoreHandler } from './types'
import placeHandler from './Place/handlers'

const topLevelHandler: StoreHandler = (store, action) => {
  placeHandler(store, action)
}

export default topLevelHandler
