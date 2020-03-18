import fetch from 'node-fetch'
import qs from 'query-string'

import * as Nominatim from '../../nominatim-api'
import type { StoreHandler } from '../types'
import type { Place } from './types'

const loadPlaces = (): Promise<ReadonlyArray<Place>> =>
  Promise.resolve().then(() => {
    const baseUrl =
      'https://nominatim.openstreetmap.org/search/'

    const params: Nominatim.Paths.Search.Get.Parameters.Query = {
      format: 'json',
      city: 'Helsinki'
    }

    return fetch(`${baseUrl}?${qs.stringify(params)}`)
  }).then(
    x => x.json()
  ).then(
    (x: Nominatim.Paths.Search.Get.Responses.$200) =>
      x.map(y => ({
        placeId: y.place_id,
        latitude: parseFloat(y.lat),
        longitude: parseFloat(y.lon),
        displayName: y.display_name,
        class: y.class,
        type: y.type,
      }))
  )

const placeHandler: StoreHandler = (store, action) => {
  const { place } = store.getState()

  if (
    action.type === 'PLACE_DATA_REQUEST' &&
    place.status !== 'loading'
  )
    loadPlaces().then(places => store.dispatch({
      type: 'PLACE_DATA_SUCCESS',
      places
    })).catch(e => store.dispatch({
      type: 'PLACE_DATA_FAILURE',
      message: e.toString()
    }))
}

export default placeHandler
