'use strict'

const Errlop = require('./index.cjs').default
const a = new Errlop('AError')
const b = new Errlop('BError', a)
const c = Errlop.create('CError', b)
console.log(c.stack)
console.log('---')
console.log(c.orphanStack)
