import type { Hyperscript, FactoryComponent, Vnode, VnodeDOM } from 'mithril'

type Attrs = {
	hash: string
	strings: TemplateStringsArray,
	values: any[]
	sheet: string
}

type Stream<T> = {
	observe(update: (x: T) => void): () => void
}

// https://gist.github.com/jlevy/c246006675becc446360a798e2b2d781
const simpleHash = (str: string): string => {
	let hash = 0
	for (let i = 0; i < str.length; i++) {
		const char = str.charCodeAt(i)
		hash = (hash << 5) - hash + char
		hash &= hash // Convert to 32bit integer
	}
	return 'css_' + new Uint32Array([hash])[0].toString(36)
}

export const sheets = new Map()

type CssLiteral = {
	tag: 'css-literal'
	value: any
}

type CssVnode = [Vnode]
type Css = CssVnode | CssLiteral

let cssNodes = new WeakSet<any>();

export function isStream(x: any): x is Stream<any> {
	return x != null && typeof x.observe === 'function'
}

export function isCssNode(x:any): x is [CssVnode] {
	return x != null && Array.isArray(x) && x[0] != null && x[0][Symbol.for('super-mithril-css')]
}

function cssFragmentValueOf() {
	throw new Error(
		'You cannot coerce bacta.css to a string, use ,css`` instead of +css``',
	)
}

function isTemplateString(strings: any): strings is TemplateStringsArray {
	return strings?.raw
}

function pretty(s: string): string {
	let out = ''
	let levels = 0
	let line = 0;
	let char = 0;
	let insignificant = true;
	for( let i = 0; i < s.length; i++) {
		let x = s[i]

		if (x == '\n') {
			if (insignificant) {
				line++
				char =0
				continue;
			} else {
				insignificant = true
				line++
				char = 0
				out+='\n'
				continue;
			}
		}
		
		if (x === '{') {
			levels++
			out+='{\n'
			insignificant = true
			continue;

		} else if (x === '}') {
			levels = Math.max(levels - 1, 0)
			out+= '  '.repeat(levels) + '}\n'
			insignificant = true
			continue;
		}

		if (insignificant && x.match(/\s/)) {
			continue;
		} else if (insignificant) {
			insignificant = false
			char += levels * 2
			out +='  '.repeat(levels)
			out += x
			continue;
		}

		char++
		out+= x

	}
	return out
}

let I = <T>(x:T) => x

type Seed = { sheet: string, values: string[], valuesStr: string }

function Reduce(values: any[]){

	return function reducer(p: Seed, n: string, i: number): Seed {
		if (values[i]?.tag === 'css-literal') {
			return {
				sheet: p.sheet + n + values[i]?.value,
				valuesStr: p.valuesStr,
				values: p.values,
			}
		} else if (isCssNode(values[i])) {
			let x = values[i][0][Symbol.for('super-mithril-css')] as Attrs
	
			const reducer = Reduce(x.values)
			let reduced = x.strings.reduce(reducer, {
				sheet: '',
				valuesStr: '',
				values: []
			})
	
			return {
				sheet: p.sheet + n + reduced.sheet,
				valuesStr: p.valuesStr + reduced.valuesStr,
				values: p.values.concat(reduced.values)
			}
	
		} else if (i in values) {
			return {
				sheet: p.sheet + n + `var(--$-n)`,
				valuesStr: p.valuesStr + '|' + values[i],
				values: p.values.concat(values[i]),
			}
		} else {
			return {
				...p,
				sheet: p.sheet + n,
			}
		}
	}
}

export default function Start(m: Hyperscript, options?: { server?: boolean, pretty?: boolean }) {
	let styleEl: [HTMLStyleElement] | [] = []

	const base = (options?.pretty ? pretty : I)(`
		css-node {
			display: none;
		}
	`)
	if (!options?.server)  {
		styleEl = [document.createElement('style')]

		for( let el of styleEl) {
			el.type = 'text/css'
			document.head.appendChild(el)
		
			el.textContent += base
		}
	} else {
		sheets.set('', base)
	}

	function css(value: string | number): CssLiteral
	function css(strings: TemplateStringsArray, ...values: any[]): CssVnode
	function css(strings: any, ...values: any[]): Css {

		if (!isTemplateString(strings)) {
			return { tag: 'css-literal', value: strings }
		}

		let seed = { sheet: '', values: [] as string[], valuesStr: '' }

	
		const reducer = Reduce(values)
		let agg = strings.reduce(reducer, seed)

		const hash = simpleHash(agg.sheet)

		agg.sheet = agg.sheet.replace(/#(?![A-z]|\d)/g, hash)

		const cssNode: Vnode = m(CssComponent, {
			key: hash,
			hash,
			sheet: agg.sheet,
			strings,
			values,
		}) as any

		;(cssNode as any)[Symbol.for('super-mithril-css')] = cssNode.attrs

		cssNodes.add(cssNode)
		;(cssNode as any).valueOf = cssFragmentValueOf

		return [cssNode]
	}

	const CssComponent: FactoryComponent<Attrs> = (initialVnode) => {
		function updateAll(
			attrs: (typeof initialVnode)['attrs'],
			dom: HTMLElement,
		) {
			const { values, hash } = attrs
			outer: for (let i = 0; i < values.length; i++) {
				let value = values[i]

				while (typeof value === 'function') {
					if (value?.['fantasy-land/map']) {
						continue outer
					}
					value = values[i]()
				}
				dom?.style?.setProperty(
					'--' + hash + '-' + i,
					value == null ? 'unset' : value,
				)
			}
		}

		const onRemoves: (() => void)[] = []

		let { values, sheet, hash } = initialVnode.attrs
		let vars: Record<string, any> = {}
		if (options?.server) {
			sheet = `.${hash} { ${sheet} }`

			for (let i = 0; i < values.length; i++) {
				let fn = values[i]
				let value = values[i]

				
				sheet = sheet.replace(`--$-n`, `--${hash}-${i}`)

				if (typeof fn === 'function') {
					while (typeof value === 'function') {
						if (isStream(value)) {
							value = values[i]()
							break
						} else {
							value = values[i]()
						}
					}
				}
				vars['--' + hash + '-' + i] = value == null ? 'unset' : value
				if (options.pretty) {
					sheet = pretty(sheet)
				}
				sheets.set(hash, sheet)
			}
		}


		const view = ({ attrs }: Vnode<Attrs>) => {
			return m('css-node.'+attrs.hash, {
				style: options?.server ? vars : {},
				oncreate(vnode: VnodeDOM<(typeof initialVnode)['attrs']>) {
					const dom = vnode.dom.parentNode as HTMLElement
					sheet = `.${hash} { ${sheet} }`
					for (let i = 0; i < values.length; i++) {
						let fn = values[i]
						let value = values[i]

						sheet = sheet.replace(`--$-n`, `--${hash}-${i}`)

						if (typeof fn === 'function') {
							while (typeof value === 'function') {
								if (isStream(value)) {
									vars['--' + hash + '-' + i] = value == null ? 'unset' : value
									onRemoves.push(() => {
										value.observe((value: any) => {
											dom.style?.setProperty(
												'--' + hash + '-' + i,
												value == null ? 'unset' : value,
											)
										})
									})
									value = values[i]()
									break
								} else {
									value = values[i]()
								}
							}
						}
					}

					if (!sheets.has(hash)) {
						sheets.set(hash, sheet)
						for( let el of styleEl ) {
							el.textContent += '\n' + sheet
						}
					}

					;(vnode.dom.parentNode as HTMLElement).classList.add(attrs.hash)
					updateAll(attrs, vnode.dom.parentNode as HTMLElement)
				},
				onupdate(vnode: VnodeDOM<(typeof initialVnode)['attrs']>) {
					// because vdom could clobber className and remove our injected class
					;(vnode.dom.parentNode as HTMLElement).classList.add(attrs.hash)
					updateAll(attrs, vnode.dom.parentNode as HTMLElement)
				},
				onremove() {
					for (let f of onRemoves) {
						f()
					}
				},
			})
		}
		return {
			view,
		}
	}

	return css
}
