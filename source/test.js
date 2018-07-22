'use strict'

const joe = require('joe')
const Errlop = require('./')
const { equal } = require('assert-helpers')

joe.suite('errlop', function (suite, test) {
	test('stacks work as expected', function () {
		const a = new Errlop('AError')
		const b = new Errlop('BError', a)
		const c = Errlop.create('CError', b)
		const stack = c.stack
		equal(stack.indexOf('CError') !== -1, true, 'CError exists in CError.stack')
		equal(stack.indexOf('BError') !== -1, true, 'BError exists in CError.stack')
		equal(stack.indexOf('AError') !== -1, true, 'AError exists in CError.stack')
		const orphanStack = c.orphanStack
		equal(orphanStack.indexOf('CError') !== -1, true, 'CError exists in CError.orphanStack')
		equal(orphanStack.indexOf('BError') !== -1, false, 'BError does not exist in CError.orphanStack')
		equal(orphanStack.indexOf('AError') !== -1, false, 'AError does not exist in CError.orphanStack')
	})
	test('exitCode works as expected', function () {
		// manual set
		const a = new Errlop('AError')
		a.exitCode = 1
		equal(a.exitCode, 1, 'a.exitCode was set correctly')

		// object set
		const aa = new Errlop({ message: 'AAError', exitCode: 11 })
		equal(aa.exitCode, 11, 'aa.exitCode was set correctly')

		// inherit
		const b = new Errlop('BError', a)
		equal(b.exitCode, 1, 'b.exitCode inherited a.exitCode correctly')

		// inherit from grandparent
		const c = new Errlop('CError', b)
		equal(c.exitCode, 1, 'c.exitCode inherited from b.exitCode which inherited from a.exitCode correctly')

		// inherit yet again, but this time override
		const d = new Errlop({ message: 'DError', exitCode: 4 }, c)
		equal(d.exitCode, 4, 'd.exitCode did not inherit but overwrote')

		// mark the expectation that updates to ancestor codes do not affect parents, as code is set at runtime
		a.exitCode = 10
		equal(b.exitCode, 1, 'b.exitCode remained the initial inherited value')
		equal(c.exitCode, 1, 'c.exitCode remained the initial inherited value')
	})
	test('exitCode can inherit from errno', function () {
		// manual set
		const a = new Error('AError')
		a.errno = 1

		// inherit
		const b = new Errlop('BError', a)
		equal(b.exitCode, 1, 'b.exitCode inherited a.exitCode correctly')
	})
	test('exitCode can inherit from code', function () {
		// manual set
		const a = new Error('AError')
		a.code = 1

		// inherit
		const b = new Errlop('BError', a)
		equal(b.exitCode, 1, 'b.exitCode inherited a.exitCode correctly')
	})
	test('exitCode correctly dismisses non numeric values', function () {
		// manual set
		const a = new Error('AError')
		a.code = new Error('annoying thing that somtimes happens')

		// inherit
		const b = new Errlop('BError', a)
		equal(b.exitCode, null, 'b.exitCode dimissed non numeric parent exit code')
	})
})
