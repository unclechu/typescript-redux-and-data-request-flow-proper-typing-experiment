// General discriminant field "status"
// and some additional optional payload
// which could be an empty object ("{}")
// if you don't need any additoinal data
// for particular data request flow state.
export type DataRequestState<I, L, S, F> =
  | Idle<I>
  | Request<L>
  | Success<S>
  | Failure<F>

// When we neither have data nor it hasn't been requested yet
export type Idle<T> =
  | { readonly [K in keyof T]: T[K] }
  & { readonly status: 'idle' }

// When data is requested and pending to be received
export type Request<T> =
  | { readonly [K in keyof T]: T[K] }
  & { readonly status: 'loading' }

// When data is successfully received
export type Success<T> =
  | { readonly [K in keyof T]: T[K] }
  & { readonly status: 'success' }

// When request to a server has failed
export type Failure<T> =
  | { readonly [K in keyof T]: T[K] }
  & { readonly status: 'failure' }
