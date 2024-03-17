# super-mithril-css

🎨 A simple reactive util for inline styles in mithril

## Quick Start

```typescript
import CSS from 'super-mithril-css'
import m from 'mithril'
import {Stream} from 'super-mithril-stream'

const { css } = CSS(m)
const color = Stream('red')
const opacity = Stream(1)

const desktop = css('(min-width: 1000px)')

m('h1', css`
    color: ${color};
    opacity: ${opacity};
    
    &.active {
        // very hot!
        color: hotpink;
    }

    ${desktop} {
        color: green;
    }
`)
```

## What

A little util that lets you write native (and very) vanilla CSS inline and pipe reactive values to css variables.

It has a few more features, but not much more than that.

## Why

We've had this built in to our internal fork of Mithril for a long time, but we're trying to extract a lot of that code into tiny libraries to share with the community.

## Tell me more

`super-mithril-css` is deliberately simple and focused.  This library gives you a very native CSS experience with affordances for reactivity.

This is an exhaustive list of what this library does:

- Takes any interpolated values you set and makes them css variables
- If your intepolated value adheres to the (sin.js inspired) observable spec, we will subscribe to them and patch the dom without redraws
- If its not an observable, the value is injected literally with no processing and updates whenever there is a redraw
- We automatically wrap your original CSS definition in hash selector to isolate your styles to the current scope
- We identify any keyframe definitions and move them to the top level (because they don't work with the nested css spec)
- We replace `#` with the hash of your sheet (but we leave id references as is)
- If you forget a semicolon, we'll inject it
- If you use `// comments` we'll fix it for you
- You can directly inject literal css text via `${css('your text')}`
- We also pretty print the styles while we parse them and compute the hash, all in one loop.
- It works in the browser and the server
- We overload the hyperscript function to allow us to inject the hash selector onto the parent
- We support nesting css expressions which helps with writing handy utils

It's a lot but its also all pretty focused on giving mithril a close to native css experience with first class reactivity.

## Composable

```typescript
const animate = (from, to, config=css('')) => {
    return css`
        @keyframes # {
            from: {${from}}
            to: {${to}}
        }

        ${from}

        & {
            animation: # ${config};
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

Our internal fork directly bound to our stream and store API, but we're taking a page from [Rasmus'](https://github.com/porsager) book and supporting a very simple and portable observable API.  If you adhere to this contract we will treat your value as an observable:

```typescript
type Stream<T> = {
	observe(update: (x: T) => void): () => void
}
```

> 🤓 You can also call `CSS.isStream(yourValue)` to verify we will treat it as a stream.

Anything not treated as a stream will be bound to the DOM on init and every redraw.

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

If you are using [mithril-node-render](https://github.com/MithrilJS/mithril-node-render) you can access the complete sheet to inject into your html via `[...css.sheets.values()]` see the tests for an example.

Note in order to attach the the selector the parent element, **for server usage only** we need to override your hyperscript function like so:

```typescript
import M from 'mithril'
import CSS from 'super-mithril-css'

const { m, css } = CSS(m, { server: true })
```

In the browser this exact same code is a passthrough to the original mithril hyperscript function, so you can run this code isomorphically.

Once `@scope` is stable on all modern browsers we can remove this constraint.

## Browser support

Evergreen only.  We do not make (web)apps that target older browsers and we aren't realistically able to support them without running up against their quirks day to day.  We also rely and plan to rely on pretty new features to keep the codebase simple.

## Pretty printing

This library pretty prints while it is pseudo-parsing your css.  At time of writing this cannot be disabled, but it wouldn't be a lot of work to change that
If it bothers you let us know.

## FAQ

### What about nested css, auto units, etc

This library deliberately just does the bare minimum.  Native CSS really isn't that bad and we feel to deviate from the syntax even a little bit you really need to be getting a lot of bang for your buck.  You should go all in or not at all.

We do automatically inject semicolons and transform comments, but that is just after reviewing many PRs seeing devs assume that will work, its not worth the friction not to support that when its so simple to implement.

If you would like us to add some other feature ask away, but its pretty likely we'll want to just keep things vanilla for this library.

### Why do we pass in the hyperscript function as any argument

A few reasons.  The first is it is much simpler than dealing with `peerDeps`, it makes this library easier to maintain and it gives you the power to swap out mithril for your own hyperscript wrapper (something we do at [Harth](https://harth.io) to add reactivity to hyperscript directly)/
