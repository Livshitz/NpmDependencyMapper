module.exports = {
	roots: [
	  "<rootDir>"
	],
	transform: {
	  	"^.+\\.ts?$": "ts-jest"
	},
	// setupFiles: [
	// 	"<rootDir>/tests/setup.ts"
	// ],
	testRegex: "(/__tests__/.*|/tests/.*(\\.|/)(test|spec))\\.ts$",
	moduleFileExtensions: [
	  "ts",
	  "tsx",
	  "js",
	  "jsx",
	  "json",
	  "node"
	],
	verbose: true
}
