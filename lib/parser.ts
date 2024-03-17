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
		return {
			...parsed,
			values
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


	let strings = ['.# {', ..._strings, '}']
	let values = [new CssLiteral(''), ..._values]
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
	let keyFrameOutIndex = 0
	let keyframeOuts: any[] = []
	let keyFrameLevel = 0
	let openKeyframes = false
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

			if (x === '#' && !string[i + 1]?.match(/[A-z]/)) {
				out.push(outs, placeHolderHash)
				outs = ''
				continue
			}

			if (
				x === '@' &&
				string.slice(i, i + '@keyframes'.length) === '@keyframes'
			) {
				out.push(outs)
				outs = ''
				keyFrameOutIndex = out.length

				// assumes you don't nest key frames
				// you wouldn't do that would you!?
				openKeyframes = true
				keyFrameLevel = levels
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
					'  '.repeat(openKeyframes ? levels - keyFrameLevel : levels) + '}\n'
				insignificant = true

				if (openKeyframes && keyFrameLevel === levels) {
					openKeyframes = false
					out.push(outs)
					outs = ''

					// put the key frame source in the correct list
					keyframeOuts.push(...out.slice(keyFrameOutIndex))

					// remove the keyframe source
					out.splice(keyFrameOutIndex, out.length - keyFrameOutIndex)
				}
				continue
			}

			if (insignificant) {
				insignificant = false
				outs += '  '.repeat(openKeyframes ? levels - keyFrameLevel : levels)
				outs += x
				continue
			}

			outs += x
		}

		if (hasValue) {
			if (value instanceof CssLiteral ) {
				if (insignificant) {
					insignificant = false
					outs += '  '.repeat(openKeyframes ? levels - keyFrameLevel : levels)
				}
				outs += value.value
				out.push(outs)
				outs = ''
			} else if (nested.has(value)) {
				const { strings, values } = nested.get(value)!()
				stringStack.unshift(...strings)
				valuesStack.unshift(...values)
			} else {
				let placeholder = new VarPlaceholder(++varI, value)
				vars.push(placeholder)
				out.push(outs, placeholder)
				outs = ''
			}
		} else {
			out.push(outs)
			outs = ''
		}
	}

	hash = `css-${new Uint32Array([hashCode])[0].toString(36)}`

	const parsed = {
		hash,
		strings,
		values,
		vars,
		sheets: [
			out.map((x) => x + '').join(''),
			keyframeOuts.map((x) => x + '').join(''),
		],
	}

	return parsed
}
