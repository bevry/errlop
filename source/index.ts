/* eslint no-dupe-class-members:0 */

/** A valid Errlop or Error instance. */
export type ErrorValid = Errlop | Error

/** Properties {@link Errlop} supports. */
export interface ErrorProperties {
	/** The description of this error. */
	message: string

	/** The code to identify this error. If a string code, it will be included in the stack. */
	code: string | number

	/** The severity level of this error. */
	level: string | number

	/** The parent that caused this error, if any. If not provided, inherited from `cause` property. */
	parent: ErrorValid | null

	/** An array of the {@link parent} lineage. Most immediate to most distant. */
	ancestors: Array<ErrorValid>

	/** A numeric code that can be used for the process exit status. If not provided, inherited from {@link ancestors} `exitCode`, `errno`, `code` numeric properties. */
	exitCode: number | null

	/** The stack of this error alone, without any ancestry. */
	orphanStack: string

	/** The stack of this error including its ancestry. */
	stack: string
}

/** An input that can become an Errlop or Error instance. */
export type ErrorInput =
	| Errlop
	| Error
	| Partial<ErrorProperties>
	| string
	| any

/** Convert to a valid number or null. */
function getNumber(input: any): number | null {
	if (input == null || input === '') return null
	const number = Number(input)
	if (isNaN(number)) return null
	return number
}

/** Fetch the exit code from the value */
function getExitCode(value: any): number | null {
	if (value != null) {
		if (typeof value.exitCode !== 'undefined') return getNumber(value.exitCode)
		if (typeof value.errno !== 'undefined') return getNumber(value.errno)
		if (typeof value.code !== 'undefined') return getNumber(value.code)
	}
	return null
}

/** Prepend a code to the stack if applicable. */
function prependCode(code: any, stack: string): string {
	if (code && typeof code === 'string' && stack.includes(code) === false)
		return `[${code}]: ${stack}`
	return stack
}

/** Errlop, an extended Error class that envelops a parent Error to provide ancestry stack inforation. */
export default class Errlop extends Error implements ErrorProperties {
	// implements
	parent: ErrorValid | null = null
	ancestors: Array<ErrorValid> = []
	exitCode: number | null = null
	orphanStack: string = ''
	declare stack: string // declare to inherit from super
	declare message: string // declare to inherit form super
	code: string | number = ''
	level: string | number = ''

	/** Duck typing so native classes can work with transpiled classes, as otherwise they would fail instanceof checks. */
	klass: typeof Errlop = Errlop

	/** Turn the input and parent into an Errlop instance. */
	constructor(input: ErrorInput, parent: ErrorInput = null) {
		if (!input)
			throw new Error('Attempted to create an Errlop without an input')

		// construct with message
		super(input.message || input)

		// parent
		// if override not set, fallback to parent or cause
		if (!parent) parent = input.parent || input.cause
		// if override, or parent/cause was set, then set this.parent
		if (parent) {
			if (Errlop.isError(parent)) {
				this.parent = parent
			} else {
				this.parent = new Errlop(parent)
			}
		}

		// ancestors, assumed to only exist on Errlop
		if (this.parent) {
			this.ancestors.push(this.parent)
			if (Errlop.isErrlop(this.parent)) {
				this.ancestors.push(...this.parent.ancestors)
			}
		}

		// exitCode, code, level
		for (const error of [input, this, ...this.ancestors]) {
			if (this.exitCode == null) {
				this.exitCode = getExitCode(error)
			}
			if (this.code === '' && error.code != null && error.code !== '') {
				this.code = getNumber(error.code) ?? error.code.toString()
			}
			if (this.level === '' && error.level != null && error.level !== '') {
				this.level = getNumber(error.level) ?? error.level.toString()
			}
		}

		// orphanStack
		this.orphanStack = prependCode(
			this.code,
			(
				input.orphanStack ||
				input.stack ||
				this.stack ||
				// this.stack should exist, unless something that extended Errlop broke it
				this.message ||
				this ||
				''
			).toString()
		)

		// stack
		this.stack = [this, ...this.ancestors]
			.map(function (error) {
				// error is either Errlop or Error, however that doesn't stop extenders from breaking them
				return prependCode(
					(error as any).code,
					(
						(error as Errlop).orphanStack ||
						error.stack ||
						// those should exist, unless something that extended Error broke it
						error.message ||
						error ||
						''
					).toString()
				)
			})
			.filter((s) => Boolean(s)) // filter out Error instances that have no stack
			.join(Errlop.stackSeparator)
	}

	// static methods

	/** The separator to use for the stack entries */
	static stackSeparator = '\n↳ '

	/** Check whether or not the value is an Errlop instance */
	static isErrlop(value: Errlop): true
	static isErrlop(value?: any): value is Errlop
	static isErrlop(value?: any): boolean {
		return value && (value instanceof this || value.klass === this)
	}

	/** Check whether or not the value is an Errlop or Error instance. */
	static isError(value: ErrorValid): true
	static isError(value?: any): value is ErrorValid
	static isError(value?: any): boolean {
		return value instanceof Error || Errlop.isErrlop(value)
	}

	/** Ensure that the value is an Errlop instance */
	static ensure(value: ErrorInput): Errlop {
		return this.isErrlop(value) ? value : this.create(value, null)
	}

	/**
	 * Syntactic sugar for Errlop class creation.
	 * Enables `Errlop.create(...)` to achieve `new Errlop(...)`
	 */
	static create(input: ErrorInput, parent: ErrorInput = null): Errlop {
		return new this(input, parent)
	}
}
