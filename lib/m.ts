import M from 'mithril'
import CSS from './index'
export const { css, m } = CSS(M, { server: !('document' in globalThis) })
export default m