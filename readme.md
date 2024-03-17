# super-mithril-css

🎨 A simple reactive util for inline styles in mithril

## Quick Start

```typescript
import CSS from 'super-mithril-css'
import m from 'mithril'
import {Stream} from 'super-mithril-stream'

const css = CSS(m)
const color = Stream('red')
const opacity = Stream(1)

m('h1', css`
    & {
        color: ${color};
        opacity: ${opacity};
    }
`)
```

## What

A little util that lets you write native vanilla CSS inline and pipe reactive values to css variables.

## Why

We've had this built in to our internal fork of Mithril for a long time, but we're trying to extract a lot of that code into tiny libraries to share with the community.

## How

`super-mithril-css` is deliberately simple and has no css parser, it simply takes the exact literal css you write and replaces your interpolated values with css variables.  It has first class support for streams so you can update styles without needing to trigger a redraw.

Calling `css` simply mounts a mithril component which manages the insertion of styles and binding reactive values to the DOM.  When the component unmounts the stream subscriptions are ended.

Aside from your interpolated values and `css(literals)` we also replace `&` with a generated classname that uses the hash of css source and we replace `#` with the hash of the sheet.  Both of these replacements are completely naive.

Finally if you interpolate a css instance into a css template literal, we merge the sheets.  This means you can build pretty complex css utils that cache really well too.

## Composable

```typescript

const animate = (from, to, config=css('')) => {
    return css`
        @keyframes # {
            from: {${from}}
            to: {${to}}
        }

        & {
            ${from}
        }

        & {
            animation # ${config};
        }
    `
}

h('.example'
    animate(
        css`opacity: 0;`
        , css`opacity: 1;`
        , 'ease-in-out 1s forwards'
    )
)
```

## Reactive

Our internal fork directly bound to our stream and store API, but we're taking a page from [Rasmus'](https://github.com/porsager) book and supporting a very simple observable API.  If you adhere to this contract we will treat your value as an observable:

```typescript
type Stream<T> = {
	observe(update: (x: T) => void): () => void
}
```

You call `CSS.isStream(yourValue)` to verify we will treat it as a stream.

Anything not treated as a stream will be bound to the DOM every redraw.

## Literals

By default all interpolated values in the CSS are treated as css variables.  If you would like to inject literal CSS text you can call `css('your string')`.

```typescript

const desktop = (cssNode) =>
    css`
        ${css(`@media (min-width)`)} {
            ${cssNode}
        }
    `

m('h1'
    , desktop(
        css`
            & {
                color: red;
            }
        `
    )
    , css`
        & {
            color: blue;
        }
    `
    , 'Cool'
)
```

## Server usage

If you are using [mithril-node-render](https://github.com/MithrilJS/mithril-node-render) you can access the complete sheet to inject into your html via `css.getSheet()` see the tests for an example.

## FAQ

### What about nested css, auto units, etc

This library deliberately just does the bare minimum.  Native CSS really isn't that bad and we feel to deviate from the syntax even a little bit you really need to be getting a lot of bang for your buck.  You should go all in or not at all.