import test from 'node:test'
import assert from 'node:assert'
// @ts-ignore
import render from 'mithril-node-render'
import { sheets, pretty } from '../lib'

import { JSDOM } from 'jsdom'

const assertStringEq = (a:string,b: string) => {
	if (a !== b ) {
		throw new Error('strings not equal: \n' + a + '\n' + b)
	}
}


test('server', async () => {
	const { css, default: m } = await import('../lib/m')
	const desktop = css('@media(min-width: 1000px)')
	const rendered = await render(
		m(
			'h1',
			css`
				color: ${'red'};

				${desktop} {
					${css`
						color: ${'blue'};
					`}
				}

				#id {
					animation: # ease-in-out 1s forwards;
				}
			`,
			'hello',
		),
	)

	const className = `css-3wjkw3`
	const jsdom = new JSDOM(`
		<html>
			<body>
				${rendered}
			</body>
		</html>
	`)

	assertStringEq(
		pretty([...sheets.values()].join('')),
		pretty(`
			.css-3wjkw3 {
				color: var(--css-3wjkw3-1);
				@media(min-width: 1000px) {
					color: var(--css-3wjkw3-2);
				}
				#id {
					animation: css-3wjkw3 ease-in-out 1s forwards;
				}
			}
		`),
	)

	await new Promise((Y) => setTimeout(Y, 200))
	const h1 = jsdom.window.document.body.querySelector('h1')

	assertStringEq(h1?.className!, className)
	assertStringEq(h1?.getAttribute('style')!, `--${className}-1:red;--${className}-2:blue`)
})
