import kava from 'kava'
import Errlop from './index.js'
import { equal, nullish, contains, notContains } from 'assert-helpers'

kava.suite('errlop', function (suite, test) {
	test('comparison', function () {
		const a = new Errlop('a')
		const b = new Error('b')
		equal(Errlop.isErrlop(a), true, 'a is an Errlop')
		equal(Errlop.isError(b), true, 'a is an Error')
		equal(Errlop.isError(a), true, 'a is an Error')
	})
	test('stacks', function () {
		const a = new Errlop('AError')
		contains(a.orphanStack, 'AError')
		equal(a.orphanStack.split(Errlop.stackSeparator).length, 1)
		contains(a.stack, 'AError')
		equal(a.stack.split(Errlop.stackSeparator).length, 1)

		const b = new Errlop('BError', a)
		contains(b.orphanStack, 'BError')
		notContains(b.orphanStack, 'AError')
		equal(b.orphanStack.split(Errlop.stackSeparator).length, 1)
		contains(b.stack, 'BError')
		contains(b.stack, 'AError')
		equal(b.stack.split(Errlop.stackSeparator).length, 2)

		const c = Errlop.create('CError', b)
		contains(c.orphanStack, 'CError')
		notContains(c.orphanStack, 'BError')
		notContains(c.orphanStack, 'AError')
		equal(c.orphanStack.split(Errlop.stackSeparator).length, 1)
		contains(c.stack, 'CError')
		contains(c.stack, 'BError')
		contains(c.stack, 'AError')
		equal(c.stack.split(Errlop.stackSeparator).length, 3)
	})
	suite('properties', function (suite, test) {
		test('object', function () {
			const e = new Errlop(
				{
					message: 'AError',
					exitCode: '0',
					code: '0',
					level: '0',
					orphanStack: 'special AError orphanStack',
					stack: 'special AError stack', // discarded because orphanStack takes preference
					parent: 'discarded', // because parent argument takes preference
					cause: 'discarded', // because parent argument takes preference
				},
				'BError'
			)
			equal(e.message, 'AError', 'message was set correctly')
			equal(e.exitCode, 0, 'exitCode was set correctly')
			equal(e.code, 0, 'code was set correctly')
			equal(e.level, 0, 'level was set correctly')
			contains(e.orphanStack, 'special AError orphanStack')
			contains(e.stack, 'special AError orphanStack')
			notContains(e.orphanStack, '[0]:')
			notContains(e.stack, '[0]:')
			notContains(e.stack, 'special AError stack')
			contains(e.stack, 'BError')
		})
		test('inheritance', function () {
			const e = new Errlop('AError', {
				message: 'BError',
				exitCode: 'discarded',
				code: '', // discarded
				level: '', // discarded
				stack: 'special BError stack', // swapped to orphanStack
				// test cause alias for parent
				cause: {
					message: 'CError',
					exitCode: '-1',
					code: 'CCode',
					level: null, // discarded
					stack: '', // discarded
					parent: new Errlop({
						exitCode: '-2', // ignored
						message: 'DError',
						code: 'DCode',
						level: 'fatal',
						orphanStack: '', // discarded
						parent: new Error('EError'),
					}),
				},
			})
			equal(e.message, 'AError', 'message was set correctly')
			equal(e.exitCode, -1, 'exitCode was set correctly')
			equal(e.code, 'CCode', 'code was set correctly')
			equal(e.level, 'fatal', 'level was set correctly')
			contains(e.stack, 'AError')
			contains(e.stack, 'BError')
			contains(e.stack, 'CError')
			contains(e.stack, 'DError')
			contains(e.stack, 'EError')
			contains(e.stack, '[CCode]:')
			contains(e.stack, '[DCode]:')

			contains(e.parent!.stack, 'BError')
			contains(e.parent!.stack, 'CError')
			contains(e.parent!.stack, 'DError')
			contains(e.parent!.stack, 'EError')
			contains(e.parent!.stack, '[CCode]:')
			contains(e.parent!.stack, '[DCode]:')
		})
	})
	suite('exitCode', function (suite, test) {
		test('exitCode can inherit from errno', function () {
			// manual set
			const a = new Error('AError')
			// @ts-ignore
			a.errno = 1

			// inherit
			const b = new Errlop('BError', a)
			equal(b.exitCode, 1, 'b.exitCode inherited a.exitCode correctly')
		})
		test('exitCode can inherit from code', function () {
			// manual set
			const a = new Error('AError')
			// @ts-ignore
			a.code = 1

			// inherit
			const b = new Errlop('BError', a)
			equal(b.exitCode, 1, 'b.exitCode inherited a.exitCode correctly')
		})
		test('exitCode correctly dismisses non numeric values', function () {
			// manual set
			const a = new Error('AError')
			// @ts-ignore
			a.code = new Error('annoying thing that sometimes happens')

			// inherit
			const b = new Errlop('BError', a)
			nullish(b.exitCode, 'b.exitCode dismissed non numeric parent exit code')
		})
	})
})
