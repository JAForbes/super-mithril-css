import * as Parser from './parser'
import { pretty } from './pretty'

import type { Static, Component, FactoryComponent, Vnode, VnodeDOM } from 'mithril'

function isTemplateString(strings: any): strings is TemplateStringsArray {
	// deliberately a lie to make it easier to make utils in userland with
	// dynamic templates, we always cache of the hash not the tempate instance
	// so there's no reason not to do this internally
	strings.raw ? strings.raw : strings
	return Array.isArray(strings)
}
type CssVnode = [
	Vnode<{ strings: TemplateStringsArray; values: any[] }, unknown>,
]
type Css = CssVnode | Parser.CssLiteral

type Options = { server?: boolean }

export const sheets = new Map()

type Stream<T> = {
	observe(update: (x: T) => void): () => void
}

export { CssLiteral } from './parser'

export function isStream(x: any): x is Stream<any> {
	return x != null && typeof x.observe === 'function'
}

export const hyperscriptPlugin = {
	before(args: any[], options?: Record<string, any>): any[] {
		return reorderArgs(args)
	},
	after( vnode: Vnode, options?: Record<string, any>): Vnode {
		if (options?.server) {
			return serverHyperscriptPlugin(vnode,)
		}
		return vnode
	}
}

const reorderArgs = (args: any[]) => {
	// has to happen before the native mithril hyperscript
	// because it does the key check there, and it will fail
	// if attrs isn't the first arg

	let newArgs = [args.shift()]
	let cssArgs = []
	while (args.length) {
		let a = args.shift()
		if (Parser.nested.has(a)) {
			cssArgs.push(a)
		} else {
			newArgs.push(a)
		}
	}
	for( let x of newArgs.concat(cssArgs) ) {
		args.push(x)
	}
	return args
}

const serverHyperscriptPlugin = (vnode: Vnode<any>): Vnode<any> => {
	for (let c of vnode.children as any) {
		if (c.tag === '[') {
			if (Parser.nested.has(c.children[0])) {
				const { strings, values } = Parser.nested.get(c.children[0])!()
				const { hash, vars } = Parser.cachedParser(strings, ...values)

				vnode.attrs ? vnode.attrs : {}
				vnode.attrs.className = vnode.attrs.className
					? `${vnode.attrs.className} ${hash}`
					: hash

				const style = (vnode.attrs.style = vnode.attrs.style
					? vnode.attrs.style
					: {})

				for (let v of vars) {
					if (isStream(v.value)) {
						// in case it can write synchronously
						const off = v.value.observe((x) => {
							style[v.varName()] = x == null ? 'unset' : x
							queueMicrotask(() => off())
						})
					} else {
						let x = v.value
						while (typeof x === 'function') {
							x = x()
						}
						style[v.varName()] = x == null ? 'unset' : x
					}
				}
			}
		}
	}

	return vnode
}

export { pretty }

export default function Setup(m: Static, options?: Options) {
	let styleEl: [HTMLStyleElement] | [] = []

	if (!options?.server) {
		styleEl = [document.createElement('style')]

		for (let el of styleEl) {
			el.type = 'text/css'
			document.head.appendChild(el)

			el.textContent += '\n'
		}
	}

	const h: Static =

		Object.assign((...args: Parameters<Static>) => {
			// has to happen before the native mithril hyperscript
			// because it does the key check there, and it will fail
			// if attrs isn't the first arg
			hyperscriptPlugin.before(args, options)

			const vnode = m(...args)

			hyperscriptPlugin.after(vnode, options)

			return vnode
		}, m)

	const Empty: Component = {view: () => ''}

	const Component: FactoryComponent<{
		strings: TemplateStringsArray
		values: any[]
	}> = () => {
		const onremoves: (() => void)[] = []
		return {
			view: ({ attrs: { strings, values } }) => {
				const parsed = Parser.cachedParser(strings, ...values)
				return m(Empty, {
					key: parsed.hash,
					onremove() {
						while (onremoves.length) {
							let f = onremoves.shift()!
							f()
						}
					},
					oninit(vnode) {
						if (!options?.server) {
							return
						}

						if (!sheets.has(parsed.hash)) {
							sheets.set(parsed.hash, parsed.sheets.join('\n'))
						}
						// rest happens in hyperscript plugin
					},
					oncreate(vnode) {
						const parent = vnode.dom.parentNode as HTMLElement;

						if (options?.server) {
							return
						}

						parent.classList.add(parsed.hash)

						if (!sheets.has(parsed.hash)) {
							for (let el of styleEl) {
								el.textContent += '\n' + parsed.sheets.join('\n')
							}
						}

						for (let v of parsed.vars) {
							if (isStream(v.value)) {
								onremoves.push(
									v.value.observe((latest) => {
										parent.style.setProperty(
											v.varName(),
											latest,
										)
									}),
								)
							}
						}
					},
				})
			},
		}
	}

	function css(value: string | number): Parser.CssLiteral
	function css(strings: TemplateStringsArray, ...values: any[]): CssVnode
	function css(strings: any, ...values: any[]): Css {
		if (!isTemplateString(strings)) {
			return Parser.literal(strings)
		}

		const comp = m(Component, { strings, values })
		const out: CssVnode = [comp]

		Parser.nested.set(out, () => ({ strings, values }))

		// todo-james use our own map, Parser wont see the comp
		Parser.nested.set(comp, () => ({ strings, values }))

		return out
	}

	return { css, h, m: h, hyperscriptPlugin }
}
