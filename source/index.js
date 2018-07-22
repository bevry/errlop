'use strict'

const util = require('util')

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
		while (ancestor) {
			this.ancestors.push(ancestor)
			ancestor = ancestor.parent
		}

		/**
		 * A numeric code to use for the exit status if desired by the consumer.
		 * It cycles through [input, this, ...ancestors] until it finds the first [exitCode, errno, code] that is valid.
		 * @type {Number?}
		 * @public
		 */
		this.exitCode = [input, this, ...this.ancestors].map((error) => parseCode(error.exitCode) || parseCode(error.errno) || parseCode(error.code)).find((exitCode) => exitCode != null)

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
