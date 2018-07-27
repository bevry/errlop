'use strict'

/**
 * Only accept codes that are numbers, otherwise discard them
 * @param {*} code
 * @returns {number}
 * @private
 */
function parseCode (code) {
	const number = Number(code)
	if (isNaN(number)) return null
	return number
}

/**
 * Prevent [a weird error on node version 4](https://travis-ci.org/bevry/editions/jobs/408828147) which has the following properties
 * @example
 * console.log(JSON.stringify(typeof value), Boolean(value), typeof value === 'undefined', value == undefined, typeof value, typeof (typeof value), `[${typeof value}]`, ['undefined'].indexOf(typeof value), typeof (typeof value))
 * // "undefined" true false false undefined string [undefined] 0 string
 * @param {*} value
 * @returns {boolean}
 * @private
 */
function isValid (value) {
	return Boolean(value) && String(typeof value) !== 'undefined'
}

/**
 * Create an instance of an error, using a message, as well as an optional parent.
 * If the parent is provided, then the `fullStack` property will include its stack too
 * @class Errlop
 * @constructor
 * @param {Errlop|Error|Object|string} input
 * @param {Errlop|Error} [parent]
 * @public
 */
class Errlop extends Error {
	constructor (input, parent) {
		if (!input) throw new Error('Attempted to create an Errlop without a input')

		// Instantiate with the above
		super(input.message || input)

		/**
		 * The parent error if it was provided.
		 * If a parent was provided, then use that, otherwise use the input's parent, if it exists.
		 * @type {Error?}
		 * @public
		 */
		this.parent = parent || input.parent

		/**
		 * An array of all the ancestors. From parent, to grand parent, and so on.
		 * @type {Array<Error>}
		 * @public
		 */
		this.ancestors = []
		let ancestor = this.parent
		while (isValid(ancestor)) {
			this.ancestors.push(ancestor)
			ancestor = ancestor.parent
		}

		// this code must support node 0.8, as well as prevent a weird bug in node v4: https://travis-ci.org/bevry/editions/jobs/408828147
		let exitCode = null
		for (let index = 0, errors = [input, this, ...this.ancestors]; index < errors.length && exitCode == null; ++index) {
			const error = errors[index]
			if (isValid(error)) {
				exitCode = parseCode(error.exitCode) || parseCode(error.errno) || parseCode(error.code)
			}
		}

		/**
		 * A numeric code to use for the exit status if desired by the consumer.
		 * It cycles through [input, this, ...ancestors] until it finds the first [exitCode, errno, code] that is valid.
		 * @type {Number?}
		 * @public
		 */
		this.exitCode = exitCode

		/**
		 * The stack for our instance alone, without any parents.
		 * If the input contained a stack, then use that.
		 * @type {string}
		 * @public
		 */
		this.orphanStack = (input.stack || this.stack).toString()

		/**
		 * The stack which now contains the accumalated stacks of its ancestors.
		 * This is used instead of an alias like `fullStack` or the like, to ensure existing code that uses `err.stack` doesn't need to be changed to remain functional.
		 * @type {string}
		 * @public
		 */
		this.stack = [this.orphanStack, ...this.ancestors].reduce((accumulator, error) => `${accumulator}\n↳ ${error.orphanStack || error.stack || error}`)
	}

	/**
	 * Syntatic sugar for Errlop class creation.
	 * Enables `Errlop.create(...args)` to achieve `new Errlop(...args)`
	 * @param {...*} args
	 * @returns {Errlop}
	 * @static
	 * @public
	 */
	static create (...args) {
		return new this(...args)
	}

	/**
	 * Ensure that the input value is an Errlop instance
	 * @param {*} value
	 * @returns {Errlop}
	 * @static
	 * @public
	 */
	static ensure (value) {
		return (value instanceof this) ? value : this.create(value)
	}
}

module.exports = Errlop
