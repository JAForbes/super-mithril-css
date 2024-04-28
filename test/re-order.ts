import assert from 'node:assert'
import test, { describe } from "node:test"
import hyperscript, { render } from 'mithril'
import CSS from '../lib'
import { nested } from '../lib/parser'

const { css, m } = CSS(hyperscript, { server: true})

describe('re-order', () => {
    test('re-order', () => {
        const rendered = (m as any)('h1', css`color: green`, css`color: green`, { key: 'cool' }, 'hello')

        assert.equal(rendered.key, 'cool')
        assert.equal(rendered.children[0].tag,'#')
        assert.equal(rendered.children[0].children,'hello')
        assert.deepEqual(
            nested.get(rendered.children[1].children[0])!(),
            { strings: [ 'color: green' ], values: [] }
        )
    })
})