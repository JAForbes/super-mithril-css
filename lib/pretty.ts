export function pretty(s: string): string {
	let out = ''
	let levels = 0
	let line = 0
	let char = 0
	let insignificant = true
	for (let i = 0; i < s.length; i++) {
		let x = s[i]

		if (x == '\n') {
			if (insignificant) {
				line++
				char = 0
				continue
			} else {
				insignificant = true
				line++
				char = 0
				out += '\n'
				continue
			}
		}

		if (x === '{') {
			levels++
			out += '{\n'
			insignificant = true
			continue
		} else if (x === '}') {
			levels = Math.max(levels - 1, 0)
			out += '  '.repeat(levels) + '}\n'
			insignificant = true
			continue
		}

		if (insignificant && x.match(/\s/)) {
			continue
		} else if (insignificant) {
			insignificant = false
			char += levels * 2
			out += '  '.repeat(levels)
			out += x
			continue
		}

		char++
		out += x
	}
	return out
}