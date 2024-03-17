import test from 'node:test'
import assert from 'node:assert'
import hyperscript from 'mithril'
// @ts-ignore
import render from 'mithril-node-render'
import CSS, { sheets, pretty } from '../lib'
import { JSDOM } from 'jsdom'

test('server', async () => {
	const { css, m } = CSS(hyperscript, { server: true})
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

	const className = `css-9qp30q`
	const jsdom = new JSDOM(`
		<html>
			<body>
				${rendered}
			</body>
		</html>
	`)

	assert.equal(
		pretty([...sheets.values()].join('')),
		pretty(`
			css-node {
				display: none;
			}
			.css-9qp30q {
				color: var(--css-9qp30q-1);
				@media(min-width: 1000px) {
					color: var(--css-9qp30q-2);
				}
				#id {
					animation: css-9qp30q ease-in-out 1s forwards;
				}
			}
		`),
	)

	await new Promise((Y) => setTimeout(Y, 200))
	const h1 = jsdom.window.document.body.querySelector('h1')

	assert.equal(h1?.className, className)
	assert.equal(h1?.getAttribute('style'), `--${className}-1:red;--${className}-2:blue`)
})
