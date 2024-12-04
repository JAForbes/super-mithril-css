# super-mithril-css

🎨 A simple css-in-js solution for mithril.js

> 🚨 This library is very new and not production ready.  Please feel free to try it out and provide feedback, but also be prepared for the occasional parser bug or some breaking API changes down the line.

## Quick Start

```typescript
import m, { css } from 'super-mithril-css/m'
import * as c from 'chifley'

const color = c('red')
const opacity = c(1)

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

## Live Example

[Check out a live example on Flems](https://flems.io/#0=N4IgZglgNgpgziAXAbVAOwIYFsZJAOgAsAXLKEAGhAGMB7NYmBvEAXwvW10QICsEqdBk2J4IWAA60ATsQAEWCnOBzqcOHNZyw02ljkByEsQlxEAenMBXNBIDWAc3x0s5uFYkxpAWiwRihNLQ3mpwAAJQGIxwxOYAJhAx5lj4-AYAOmjiUrJyAFRyGBrU2rr6RsQmZpbwKXCE5tSEEGCwAJ5haDAAHsQZaJlCMXIAghIScgC8cgAUAJRTAHzKmXJyq6r0w3RQMlOq+ADKxNIw2DO71BhQxzIYDjD4D8QAkoxYMwY7MgYLAPx-QwAYgAYiCAAyQ8G-DYbb7SfBwOwQCQzACMc3wWAwqNUSxWaDWa0u11u0nujzgMFe70+8IMSmocw2rGZhLksHkpzQcS8Gmm4I2p2IVmkhOAGzWADcIDAAO6IWYLSbLSVEgDU6u5vOkGgAZHq1WsPgZ+kTzXJGeoAAZGi2IBiEELNKBxdELCXsi0W+GKgAkwHhrAA3Hbzaww3JresvRaKCaJAzDIQYFBdjDY+b459E0oDA5aLQ4gAjNowDPetbZgwQWxWYjIYhtTyTeEAXSTkbWKnotYk9cVMHxnsrFsepzi5Ll+zA1ypXaJ8MR1Jmj2IGGkz3wUuuVhgbNHawjmbjch3UD3iqXz3mMcPmjvlYPlerucMfgCQSgcgnU7MhiUbU+Wfc1n2PY8UiwWgbGIGY4loagrBwBh8GLIs2iUMYJDmSgQCpWBqGICAtjwcFEHBbwAGYABZEAAJgAdjYDgQEwHA8GcdRcKERhmB4Ng21YIA)

## What

A little util that lets you write native (and very) vanilla CSS inline and pipe reactive values to css variables.

It has a few more features, but not much more than that.

## Why

We've had this built in to our internal fork of Mithril at [harth](harth.io) for a long time, but we're trying to extract a lot of that code into tiny libraries to share with the community.

## Tell me more

`super-mithril-css` is deliberately simple and focused.  This library gives you a very native CSS experience with affordances for reactivity.

This is an exhaustive list of what this library does:

- Takes any interpolated values you set and makes them css variables
- If your intepolated value adheres to the observable spec, we will subscribe to them and patch the dom without redraws
- If its not an observable, the value is injected literally with no processing and updates whenever there is a redraw
- We automatically wrap your original CSS definition in a block with a hash selector to isolate your styles to the current scope
- We identify any `@keyframes` definitions and move them to the top level (because they don't work with the nested css spec)
- We identify any `:root` blocks and move them to the top level
- We replace `#` with the hash of your sheet (but we leave id references as is)
- If you forget a semicolon, we'll inject it
- If you use `// comments` we'll fix it for you
- You can directly inject literal css text via `${css('your text')}`
- We also pretty print the styles while we parse them and compute the hash, all in one loop.
- It works in the browser and on the server
- We overload the hyperscript function to allow us to inject the hash selector onto the parent and to re-order elements so attrs always comes first
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

> 🤓 We will soon release our stream API _chifley_, some of the mithril community are already playing with it.  If you'd like to request early access, leave a comment [here](https://mithril.zulipchat.com/#narrow/channel/324076-general/topic/New.20stream.20library!)

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

If you are using [mithril-node-render](https://github.com/MithrilJS/mithril-node-render) you can access the complete sheet to inject into your html via `[...css.sheets.values()]` (see the tests for an example).

Note: in order to attach the the selector the parent element on the server we need to override your hyperscript function like so:

```typescript
import { sheets } from '../lib'
import m, { css } from 'super-mithril-css/m'

```

In the browser we also override the hyperscript function to ensure attrs written after css nodes are moved to the start of the child list.

## Global css

Within a css expression if you use `:root` the css will be hoisted to the top level of the produced document.  So any selectors that you'd like to be global should use a `:root` block e.g.

```typescript
css`
	:root {
		/* Resets */
		* {
			margin: 0;
			padding: 0;
			hyphens: auto;
			border: 0 solid var(--border);
			outline-width: 1px;
			outline-style: solid;
			outline-color: transparent;

			&, &::before, &::after {
				box-sizing: border-box;
			}
		}
	}
`
```

All other features will still work in a `:root` block including observables interpolation and css literals.

## Editor support

While not strictly designed for this library, the [vscode-styled-components](https://marketplace.visualstudio.com/items?itemName=styled-components.vscode-styled-components) works well for css property checking and completions.

In other editors its pretty likely you'll get some kind of support as `css` tagged template literals are a good hint to an editor or language service that you are in a css language context.  As this library sticks pretty close to native css we can piggy back on other communities hard work.

One issue you may run into is using `#` as a property name, as typescript will rightly complain that the property name is not valid.  You can configure typescript to treat `#` as a valid property:

```json
// in your tsconfig.json
{
	"plugins": [
		{
			"name": "typescript-styled-plugin",
			"lint": {
				"validProperties": ["#"]
			}
		}
	]
}
```

## Browser support

Evergreen only.  We do not actively work on (web)apps that target older browsers and we aren't realistically able to support them without running up against their quirks day to day.  We also rely and plan to rely on pretty new features to keep the codebase simple.

## Pretty printing

This library pretty prints while it is pseudo-parsing your css.  At time of writing this cannot be disabled, but it wouldn't be a lot of work to change that.  If it bothers you let us know.

## FAQ

### Why does super-mithril-css export its own mithril?

This library has to inject some extra functionality into mithril's hyperscript functionality

- On the server we need to attach a generated classname to the parent element
- On the client and server we reorder args so `css` always comes after `attrs`

To make the library super simple to use and adhere to mithril's tradition of only 1 import.

### Why not use peerDeps?

We feel peer deps are bit a convoluted, if you would like to manually parameterize `m` you can do so:

```js
import M from 'mithril'
import CSS from 'super-mithril-css'

const { m, css } = CSS(M)
```

### I tried some of my css and it didn't render?

This library is fairly new, and while the parser has lots of tests and is being used in production, its definitely possible to confuse it if you are doing complex expressions across multiple lines.  If you come across a situation where the parser gets confused please let us know and we'll patch it quickly.

We also welcome contributions!

### What do you mean by 'pseudo-parsing'?

css is a constantly evolving language, and we don't want to bake in any assumptions that could lead to this library not supporting future features.  We also want to parse and render the css as quickly as possible. This library therefore trusts you to write correctly formatted css.  

The parser detects groupings.  It detects the start and end of rules.  It detects when you've entered or exited a comment.  It detects nested rules/blocks.

It also detects the usage of `:root` and moves in any `:root` block outside of the scoped context.
But largely, the css you write, is the css we render.  This library doesn't build an AST and then print CSS from the AST, it collects groups of rules and blocks and prints them again in order.

We do pretty print your css but only because this allows us to deterministically hash your styles to support client side hand off of server rendered styles.