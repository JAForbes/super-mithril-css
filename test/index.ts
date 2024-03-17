import test from 'node:test'
import assert from 'node:assert'
import m from 'mithril'
import render from 'mithril-node-render'
import CSS, { sheets } from '../lib'

test('core', async () => {
	const css = CSS(m, { server: true, pretty: true })
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
					animation # ease-in-out 1s forwards;
				}
			`,
			'hello',
		),
	)
	console.log(rendered)
	
	for( let sheet of sheets.values() ) {
		console.log(sheet)
	}
})
