import type { DataRequestState } from '../../generic-types'

export interface Place {
  readonly placeId: number
  readonly latitude: number
  readonly longitude: number
  readonly displayName: string
  readonly class: string
  readonly type: string
}

export interface ReceivedData {
  readonly places: ReadonlyArray<Place>
}

// Using "ReceivedData" just to show both interface and
// inlined object type are allowed.
export type PlaceState =
  DataRequestState<
    {},
    {},
    ReceivedData,
    { readonly message: string }
  >

export type PlaceAction =
  {
    readonly type: 'PLACE_DATA_REQUEST'
  }|{
    readonly type: 'PLACE_DATA_SUCCESS'
    readonly places: ReadonlyArray<Place>
  }|{
    readonly type: 'PLACE_DATA_FAILURE'
    readonly message: string
  }
