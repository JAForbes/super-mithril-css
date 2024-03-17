import * as Parser from './parser'
import { pretty } from './pretty'

import type { Static, FactoryComponent, Vnode, VnodeDOM } from 'mithril'

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

export function isStream(x: any): x is Stream<any> {
	return x != null && typeof x.observe === 'function'
}

export const hyperscriptPlugin = (vnode: Vnode<any>): Vnode<any> => {
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

	const base = pretty(`
		css-node {
			display: none;
		}
	`)

	if (!options?.server) {
		styleEl = [document.createElement('style')]

		for (let el of styleEl) {
			el.type = 'text/css'
			document.head.appendChild(el)

			el.textContent += '\n' + base
		}
	} else {
		sheets.set('', base)
	}

	const h: Static = 
		options?.server
		? Object.assign((...args: Parameters<Static>) => {
			const vnode = m(...args)

			hyperscriptPlugin(vnode)

			return vnode
		}, m)
		: m

	const Component: FactoryComponent<{
		strings: TemplateStringsArray
		values: any[]
	}> = () => {
		const onremoves: (() => void)[] = []
		return {
			view: ({ attrs: { strings, values } }) => {
				const parsed = Parser.cachedParser(strings, ...values)
				return m('css-node', {
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
						if (options?.server) {
							return
						}

						(vnode.dom as any).parentNode.classList.add(parsed.hash)

						if (!sheets.has(parsed.hash)) {
							for (let el of styleEl) {
								el.textContent += '\n' + parsed.sheets.join('\n')
							}
						}

						for (let v of parsed.vars) {
							if (isStream(v.value)) {
								onremoves.push(
									v.value.observe((latest) => {
										;(vnode.dom.parentNode as HTMLElement).style.setProperty(
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
