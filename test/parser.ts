import { describe, it } from 'node:test'
import assert from 'node:assert'

import {literal, nested, parser} from '../lib/parser'
import { pretty } from '../lib/pretty'

function css(strings: TemplateStringsArray, ...values: any[]){
	const o = { strings, values }
	nested.set(o, () => o)
	return o
}

describe('parser', () => {

	it('kitchen sink', () => {

		const parsed = parser`
			& {
				color: ${'blue'}
	
				${literal('@media(min-width: 1000px)')}{
					color: ${'red'}
				}
	
				#id {
					animation: # ease-in-out 1s forwards
				}
	
				& {
					& {
						@keyframes # {
							from {
								// semicolons
								opacity: 0%;
							}
							to {
								opacity: 100%;
							}
						}
	
						${css`
							color: green
						`}
					}
				}
			}
		`

		assert.equal(
			pretty(
				parsed.sheets.join('\n')
			),
			pretty(`
				.css-hqdj3x {
	  
					& {
						color: var(--css-hqdj3x-1);
						@media(min-width: 1000px){
							color: var(--css-hqdj3x-2);
						}
						#id {
							animation: css-hqdj3x ease-in-out 1s forwards;
						}
						& {
							& {
								color: green;
							}
						}
					}
				}
				@keyframes css-hqdj3x {
					from {
						/* semicolons */
						opacity: 0%;
					}
					to {
						opacity: 100%;
					}
				}
			`)
		)
	})

	


})
