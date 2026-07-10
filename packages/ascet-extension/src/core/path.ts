export function normalizeAscetPath(input: string): string {
	return input.replace(/\//g, "\\");
}
