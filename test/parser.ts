import { describe, it } from 'node:test'
import assert from 'node:assert'

import {literal, nested, parser} from '../lib/parser'
import { pretty } from '../lib/pretty'

function css(strings: TemplateStringsArray, ...values: any[]){
	const o = { strings, values }
	nested.set(o, () => o)
	return o
}

const assertStringEq = (a:string,b: string) => {
	if (a !== b ) {
		throw new Error('strings not equal: \n' + a + '\n' + b)
	}
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

		assertStringEq(
			pretty(
				parsed.sheets.join('\n')
			),
			pretty(`
				.css-1javx68 {
	  
					& {
						color: var(--css-1javx68-1);
						@media(min-width: 1000px){
							color: var(--css-1javx68-2);
						}
						#id {
							animation: css-1javx68 ease-in-out 1s forwards;
						}
						& {
							& {
								color: green;
							}
						}
					}
				}
				@keyframes css-1javx68 {
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


	it(':root', () => {
		{
			const parsed = parser`
				:root {
					--color: blue;
				}
			`
	
			assertStringEq(
				pretty(
					parsed.sheets.join('\n')
				),
				pretty(`
					:root {
						--color: blue;
					}
				`)
			)
		}

		{
			const parsed = parser`
				--color: green;

				:root {
					--color: blue;
				}
			`
	
			assertStringEq(
				pretty(
					parsed.sheets.join('\n')
				),
				pretty(`
					.css-sjxj49 {
						--color: green;
					}
					:root {
						--color: blue;
					}
				`)
			)
		}

		{
			const parsed = parser`
				--color: green;

				:root {
					:root {
						--color: blue;

						@keyframes # {
							from {
								/* semicolons */
								opacity: 0%;
							}
							to {
								opacity: 100%;
							}
						}
					}
				}

				--size: 100px;
			`
	
			assertStringEq(
				pretty(
					parsed.sheets.join('\n')
				),
				pretty(`
					.css-1ww73i5 {
						--color: green;
						--size: 100px;
					}
					:root {
						:root {
							--color: blue;
							@keyframes css-1ww73i5 {
								from {
								/* semicolons */
								opacity: 0%;
								}
								to {
								opacity: 100%;
								}
							}
						}
					}
				`)
			)
		}
	})
})
