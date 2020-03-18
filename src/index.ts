import store from './store'

console.debug('initial state', store.getState())

store.subscribe(() => {
  console.debug('received new state', store.getState())
})


store.dispatch({ type: 'COUNTER_INCREMENT' })
store.dispatch({ type: 'COUNTER_INCREMENT' })
store.dispatch({ type: 'COUNTER_INCREMENT' })
store.dispatch({ type: 'COUNTER_DECREMENT' })
store.dispatch({ type: 'PLACE_DATA_REQUEST' })
