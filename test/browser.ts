import test from 'node:test'
import { pretty, sheets } from '../lib'
import { JSDOM, VirtualConsole } from 'jsdom'
import assert from 'node:assert'

test('browser', async () => {
	let jsdom = new JSDOM(
		`
		<html>
			<body></body>
		</html>
	`,
		{
			pretendToBeVisual: false,
			// resources: 'usable',
			virtualConsole: new VirtualConsole()
		},
	)

	;(globalThis as any).window = jsdom.window
	;(globalThis as any).document = jsdom.window.document
	// just sync render, easier tests
	;(globalThis as any).requestAnimationFrame = (f:any) => f()

	const { css, default:m } = await import('../lib/m')
	const desktop = css('@media(min-width: 1000px)')

	const className = `css-x3m6yr`

	m.mount(document.body, () => {
		return {
			view: () =>
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
		}
	})

	m.redraw()

	assert.equal(
		pretty(document.head.children[0].innerHTML),
		pretty(`
		  .${className} {
			color: var(--${className}-1);
			@media(min-width: 1000px) {
			  color: var(--${className}-2);
			}
			#id {
			  animation: ${className} ease-in-out 1s forwards;
			}
		  }
		`),
	)
})
