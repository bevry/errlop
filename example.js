'use strict'

const Errlop = require('./')
const a = new Errlop('AError')
const b = new Errlop('BError', a)
const c = Errlop.create('CError', b)
console.log(c.stack)
console.log(c.orphanStack)
