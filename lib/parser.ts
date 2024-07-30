type VarPlaceholder = {
	i: number
	value: any
	valueOf(): string
	varRef(): string
	varName(): string
}

export type Parsed = {
	hash: string
	strings: string[]
	values: any[]
	sheets: string[]
	vars: VarPlaceholder[]
}

export const parsedByTemplate = new WeakMap<TemplateStringsArray, Parsed>()

export const nested = new WeakMap<any, () => ({ strings: TemplateStringsArray, values: any[] })>

export function cachedParser(strings: TemplateStringsArray, ...values: any[]): Parsed {
	if (parsedByTemplate.has(strings)) {
		const parsed = parsedByTemplate.get(strings)!
		const vars: VarPlaceholder[] = []

		let varI = 0;
		for(let value of values ) {
			if (value instanceof CssLiteral ) {
				continue;
			} else if (nested.has(value)) {
				continue;
			} else {
				vars.push({
					i: ++varI,
					value,
					varRef(){
						return `var(--${parsed.hash}-${this.i})`
					},
					varName(){
						return `--${parsed.hash}-${this.i}`
					},
					valueOf(){
						return this.varRef()
					}
				})
			}
		}

		return {
			...parsed,
			values,
			vars
		}
	}
	const out = parser(strings, ...values)
	parsedByTemplate.set(strings, out)
	return out
}

export class CssLiteral {
	value: string

	constructor(value: string) {
		this.value = value
	}
}

export const literal = (x:string) => new CssLiteral(x)

export function parser(_strings: TemplateStringsArray, ..._values: any[]): Parsed {
	let placeHolderHash = {
		valueOf() {
			return hash
		},
	}

	class VarPlaceholder {
		i: number
		value: any
		constructor(i: number, value: any) {
			this.i = i
			this.value = value
		}
		varRef() {
			return `var(--${hash}-${this.i})`
		}
		varName() {
			return `--${hash}-${this.i}`
		}
		valueOf(){
			return this.varRef()
		}
	}


	let strings = _strings as any as string[]
	let values = _values
	let levels = 0
	let insignificant = true
	let hashCode = 0
	let stringStack = [...strings]
	let valuesStack = [...values]
	let out: any[] = []
	let outs = ''
	let hash = ''
	let vars: VarPlaceholder[] = []
	let varI = 0
	let globalOutIndex = 0
	let globalOuts: any[] = []
	let globalLevel = 0
	let openGlobal = false
	let openProperty = false;
	let openComment = false;

	while (stringStack.length) {
		let string = stringStack.shift()!

		let hasValue = valuesStack.length
		let value = valuesStack.shift()

		for (let i = 0; i < string.length; i++) {
			let x = string[i]
			hashCode = (hashCode << 5) - hashCode + x.charCodeAt(0)
			hashCode &= hashCode

			if (insignificant && x.match(/\s/)) {
				continue
			}

			if ( x === ':' ) {
				openProperty = true
			}
			if ( x === ';' && openProperty ) {
				openProperty = false
			}
			if ( string.slice(i,i+2) === '//' ) {
				openComment = true
				outs += '/*'
				i+=1
				insignificant = false
				continue
			}

			if (x === '\n') {
				if (openProperty) {
					openProperty = false
					outs += ';'
				}
				if (openComment) {
					openComment = false
					outs += ' */'
				}
				if (insignificant) {
					continue
				} else {
					insignificant = true
					outs += '\n'
					continue
				}
			}

			// have to account for ids and hex colours
			if (x === '#' && string[i + 1]?.match(/[A-z][0-9]|\s/)) {
				if (openGlobal) {
					globalOuts.push(outs, placeHolderHash)
				} else {
					out.push(outs, placeHolderHash)
				}
				outs = ''
				continue
			}

			if (
				x === '@' &&
				string.slice(i, i + '@keyframes'.length) === '@keyframes'
				&& !openGlobal
			) {
				out.push(outs)
				outs = ''
				globalOutIndex = out.length

				// assumes you don't nest key frames
				// you wouldn't do that would you!?
				openGlobal = true
				globalLevel = levels
			}

			if ( x === ':' && string.slice(i, i + ':root'.length ) === ':root' && !openGlobal ) {
				out.push(outs)
				outs = ''
				globalOutIndex = out.length
				openGlobal = true
				globalLevel = levels
			}

			if (x === '{') {
				levels++
				outs += '{\n'
				insignificant = true
				continue
			} else if (x === '}') {
				if (levels == 0) {
					throw new Error('CSS had unmatched braces')
				}
				levels = levels - 1
				outs +=
					'  '.repeat(openGlobal ? levels - globalLevel : levels) + '}\n'
				insignificant = true

				if (openGlobal && globalLevel === levels) {
					openGlobal = false
					out.push(outs)
					outs = ''

					// put the key frame source in the correct list
					globalOuts.push(...out.slice(globalOutIndex))

					// remove the keyframe source
					out.splice(globalOutIndex, out.length - globalOutIndex)
				}
				continue
			}

			if (insignificant) {
				insignificant = false
				outs += '  '.repeat(openGlobal ? levels - globalLevel : levels)
				outs += x
				continue
			}

			outs += x
		}

		if (hasValue) {
			if (value instanceof CssLiteral ) {
				if (insignificant) {
					insignificant = false
					outs += '  '.repeat(openGlobal ? levels - globalLevel : levels)
				}
				outs += value.value
				openGlobal ? globalOuts.push(outs) : out.push(outs)
				outs = ''
			} else if (nested.has(value)) {
				const { strings, values } = nested.get(value)!()
				stringStack.unshift(...strings)
				valuesStack.unshift(...values)
			} else {
				let placeholder = new VarPlaceholder(++varI, value)
				vars.push(placeholder)
				openGlobal ? globalOuts.push(outs, placeholder) : out.push(outs, placeholder)
				outs = ''
			}
		} else {
			openGlobal ? globalOuts.push(outs) : out.push(outs)
			outs = ''
		}
	}

	hash = `css-${new Uint32Array([hashCode])[0].toString(36)}`

	const mainBodyEmpty = out.length === 2 && out.filter( x => x !== '').length == 0
	const parsed = {
		hash,
		strings,
		values: mainBodyEmpty ? values : [new CssLiteral(''), ...values],
		vars,
		sheets:  [
			mainBodyEmpty
			? ''
			: [`.${hash} {`, ...out, '}'].map((x) => x + '').join('')
			, globalOuts.map((x) => x + '').join('')
		]
	}

	return parsed
}
