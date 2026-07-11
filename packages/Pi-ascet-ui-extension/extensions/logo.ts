import { truncateToWidth, visibleWidth as tuiVisibleWidth } from "@earendil-works/pi-tui";

export const BRAND_NAME = "VM";

export const BRAND_LOGO = [
	"██╗   ██╗███╗   ███╗",
	"██║   ██║████╗ ████║",
	"██║   ██║██╔████╔██║",
	"╚██╗ ██╔╝██║╚██╔╝██║",
	" ╚████╔╝ ██║ ╚═╝ ██║",
	"  ╚═══╝  ╚═╝     ╚═╝",
];
export const COMPACT_BRAND_LOGO = [BRAND_NAME];

export const INTRO_MS = 3000;
export const INTRO_TICK_MS = 33;

export interface ShineConfig {
	strength: number;
	pos: number;
}

export interface LogoColorScheme {
	name: string;
	stops: ReadonlyArray<readonly [number, number, number]>;
	ramp256: readonly number[];
}

export const GRADIENT_STOPS: ReadonlyArray<readonly [number, number, number]> = [
	[170, 24, 36],
	[230, 10, 25],
	[150, 45, 130],
	[65, 55, 145],
	[15, 75, 150],
	[20, 145, 190],
	[20, 185, 210],
	[0, 155, 105],
	[130, 185, 90],
	[25, 125, 55],
];

export const GRADIENT_RAMP_256 = [124, 196, 126, 61, 25, 32, 44, 35, 113, 28] as const;

const LOGO_COLOR_SCHEMES: readonly LogoColorScheme[] = [
	{
		name: "spectrum-glass",
		stops: GRADIENT_STOPS,
		ramp256: GRADIENT_RAMP_256,
	},
	{
		name: "arc-plasma",
		stops: [
			[190, 28, 45],
			[237, 49, 68],
			[178, 64, 160],
			[83, 66, 176],
			[24, 92, 174],
			[28, 167, 211],
			[0, 157, 117],
			[119, 190, 87],
		],
		ramp256: [124, 160, 161, 91, 62, 27, 39, 36, 78, 34],
	},
	{
		name: "aurora-lab",
		stops: [
			[145, 27, 42],
			[220, 20, 38],
			[146, 62, 158],
			[62, 74, 170],
			[22, 117, 190],
			[51, 202, 218],
			[4, 160, 121],
			[148, 198, 95],
		],
		ramp256: [88, 196, 126, 62, 26, 32, 51, 36, 114, 28],
	},
	{
		name: "signal-core",
		stops: [
			[160, 22, 35],
			[235, 12, 22],
			[166, 38, 121],
			[48, 48, 139],
			[11, 76, 151],
			[13, 172, 207],
			[0, 146, 99],
			[121, 183, 84],
			[21, 115, 51],
		],
		ramp256: [124, 196, 125, 61, 25, 38, 44, 35, 107, 28],
	},
	{
		name: "laser-orchid",
		stops: [
			[255, 49, 94],
			[242, 88, 212],
			[126, 87, 255],
			[42, 144, 255],
			[0, 216, 255],
			[0, 190, 136],
			[180, 220, 80],
		],
		ramp256: [203, 198, 201, 135, 63, 33, 45, 36, 112],
	},
	{
		name: "molten-circuit",
		stops: [
			[255, 72, 32],
			[255, 164, 45],
			[236, 225, 87],
			[75, 207, 132],
			[15, 197, 190],
			[35, 115, 220],
			[108, 80, 210],
		],
		ramp256: [202, 208, 221, 113, 42, 44, 33, 62],
	},
	{
		name: "glacier-pulse",
		stops: [
			[76, 112, 255],
			[81, 181, 255],
			[80, 230, 229],
			[176, 245, 190],
			[255, 236, 150],
			[255, 130, 144],
			[205, 94, 255],
		],
		ramp256: [63, 75, 81, 51, 157, 222, 210, 171],
	},
	{
		name: "cyber-rose",
		stops: [
			[210, 28, 78],
			[255, 72, 139],
			[245, 120, 74],
			[80, 210, 165],
			[32, 205, 225],
			[55, 100, 230],
			[125, 72, 210],
		],
		ramp256: [161, 205, 209, 78, 44, 33, 99],
	},
	{
		name: "mint-voltage",
		stops: [
			[25, 120, 65],
			[0, 190, 125],
			[87, 232, 155],
			[75, 215, 235],
			[60, 132, 245],
			[119, 82, 220],
			[224, 74, 180],
		],
		ramp256: [28, 35, 48, 50, 39, 63, 135, 200],
	},
	{
		name: "mono-glass",
		stops: [
			[58, 60, 66],
			[92, 96, 104],
			[142, 146, 154],
			[210, 213, 218],
			[245, 246, 248],
			[174, 178, 186],
			[95, 99, 108],
		],
		ramp256: [238, 240, 244, 250, 255, 248, 242],
	},
	{
		name: "graphite-mist",
		stops: [
			[32, 34, 38],
			[64, 68, 76],
			[108, 113, 124],
			[150, 156, 166],
			[198, 202, 208],
			[128, 134, 145],
			[54, 58, 66],
		],
		ramp256: [236, 239, 243, 247, 252, 245, 238],
	},
	{
		name: "paper-ink",
		stops: [
			[236, 236, 232],
			[196, 198, 194],
			[145, 148, 146],
			[96, 100, 104],
			[48, 52, 58],
			[20, 22, 28],
		],
		ramp256: [255, 250, 246, 242, 238, 234],
	},
	{
		name: "muted-slate",
		stops: [
			[85, 94, 110],
			[104, 111, 132],
			[122, 116, 148],
			[112, 135, 157],
			[98, 154, 156],
			[130, 160, 134],
		],
		ramp256: [60, 67, 103, 66, 73, 108],
	},
	{
		name: "dusty-rosewood",
		stops: [
			[112, 78, 88],
			[142, 92, 105],
			[154, 116, 102],
			[136, 130, 112],
			[104, 132, 128],
			[94, 112, 138],
		],
		ramp256: [95, 132, 137, 144, 109, 67],
	},
	{
		name: "soft-terminal",
		stops: [
			[78, 102, 92],
			[96, 128, 112],
			[126, 142, 116],
			[148, 132, 112],
			[132, 112, 132],
			[102, 112, 150],
		],
		ramp256: [65, 72, 107, 138, 97, 67],
	},
];

const DEFAULT_SCHEME = LOGO_COLOR_SCHEMES[0];
const RESET = "\x1b[0m";
const SHINE_HALF_WIDTH = 0.18;
const INTRO_SWEEPS = 2.5;
const INTRO_SHINE_TRAVERSALS = 3;
let nextSchemeIndex = Math.floor(Math.random() * LOGO_COLOR_SCHEMES.length);

export function randomLogoColorScheme(excludeName?: string): LogoColorScheme {
	const candidates =
		LOGO_COLOR_SCHEMES.length > 1 && excludeName
			? LOGO_COLOR_SCHEMES.filter((scheme) => scheme.name !== excludeName)
			: LOGO_COLOR_SCHEMES;
	return candidates[Math.floor(Math.random() * candidates.length)] ?? DEFAULT_SCHEME;
}

export function nextLogoColorScheme(): LogoColorScheme {
	const scheme = LOGO_COLOR_SCHEMES[nextSchemeIndex] ?? DEFAULT_SCHEME;
	nextSchemeIndex = (nextSchemeIndex + 1) % LOGO_COLOR_SCHEMES.length;
	return scheme;
}

export function visibleWidth(str: string): number {
	return tuiVisibleWidth(str);
}

export function centerLine(line: string, width: number): string {
	const safeWidth = Math.max(0, width);
	const fitted = truncateToWidth(line, safeWidth, "", false);
	const lineWidth = visibleWidth(fitted);
	if (lineWidth >= safeWidth) return fitted;
	const left = Math.floor((safeWidth - lineWidth) / 2);
	return " ".repeat(left) + fitted + " ".repeat(safeWidth - lineWidth - left);
}

export function gradientEscape(t: number, scheme: LogoColorScheme = DEFAULT_SCHEME, shine?: ShineConfig): string {
	const normalized = (((t % 1) + 1) % 1);
	const shineStrength = shine && shine.strength > 0 ? shine.strength : 0;
	const shinePos = shine ? shine.pos : 0;

	if (supportsTrueColor()) {
		const stops = scheme.stops.length >= 2 ? scheme.stops : DEFAULT_SCHEME.stops;
		const seg = normalized * (stops.length - 1);
		const index = Math.min(stops.length - 2, Math.floor(seg));
		const mix = seg - index;
		const a = stops[index];
		const b = stops[index + 1];
		let red = a[0] + (b[0] - a[0]) * mix;
		let green = a[1] + (b[1] - a[1]) * mix;
		let blue = a[2] + (b[2] - a[2]) * mix;

		if (shineStrength > 0) {
			const intensity = shineIntensity(normalized, shinePos, shineStrength);
			red += (255 - red) * intensity;
			green += (255 - green) * intensity;
			blue += (255 - blue) * intensity;
		}

		return `\x1b[38;2;${Math.round(red)};${Math.round(green)};${Math.round(blue)}m`;
	}

	const ramp = scheme.ramp256.length > 0 ? scheme.ramp256 : DEFAULT_SCHEME.ramp256;
	let index = Math.min(ramp.length - 1, Math.max(0, Math.floor(normalized * (ramp.length - 1) + 0.5)));
	if (shineIntensity(normalized, shinePos, shineStrength) > 0.5) {
		index = ramp.length - 1;
	}
	return `\x1b[38;5;${ramp[index]}m`;
}

export function gradientLogo(
	lines: readonly string[],
	scheme: LogoColorScheme = DEFAULT_SCHEME,
	phase = 0,
	shine?: ShineConfig,
): string[] {
	const rows = lines.length;
	const cols = Math.max(1, ...lines.map((line) => visibleWidth(line)));
	const span = Math.max(1, cols + rows - 1);

	return lines.map((line, y) => {
		let result = "";
		let x = 0;
		for (const char of line) {
			if (char === " ") {
				result += char;
				x += 1;
				continue;
			}
			const base = (x + (rows - 1 - y)) / span;
			const t = (((base + phase) % 1) + 1) % 1;
			result += gradientEscape(t, scheme, shine) + char + RESET;
			x += visibleWidth(char);
		}
		return result;
	});
}

export function gradientRule(width: number, scheme: LogoColorScheme = DEFAULT_SCHEME, phase = 0): string {
	const safeWidth = Math.max(0, width);
	let result = "";
	for (let x = 0; x < safeWidth; x++) {
		const t = safeWidth <= 1 ? 0 : x / safeWidth;
		result += gradientEscape(t + phase, scheme) + "─" + RESET;
	}
	return result;
}

export function introEasedProgress(progress: number): number {
	const clamped = Math.min(1, Math.max(0, progress));
	return 1 - (1 - clamped) ** 3;
}

export function introGradientPhase(progress: number): number {
	const eased = introEasedProgress(progress);
	return ((((1 - eased) * INTRO_SWEEPS) % 1) + 1) % 1;
}

export function introRuleFrame(width: number, progress: number, scheme: LogoColorScheme = DEFAULT_SCHEME): string {
	const safeWidth = Math.max(0, width);
	const visibleColumns = Math.min(safeWidth, Math.floor(safeWidth * introEasedProgress(progress)));
	return gradientRule(visibleColumns, scheme, introGradientPhase(progress)) + " ".repeat(safeWidth - visibleColumns);
}

export function introLogoFrame(progress: number, scheme: LogoColorScheme = DEFAULT_SCHEME): string[] {
	const clamped = Math.min(1, Math.max(0, progress));
	const eased = introEasedProgress(clamped);
	const phase = introGradientPhase(clamped);
	const shinePos = (((clamped * INTRO_SHINE_TRAVERSALS) % 1) + 1) % 1;
	const shineStrength = (1 - eased) ** 1.5;
	return gradientLogo(BRAND_LOGO, scheme, phase, { strength: shineStrength, pos: shinePos });
}

export function restingLogoFrame(scheme: LogoColorScheme = DEFAULT_SCHEME): string[] {
	return gradientLogo(BRAND_LOGO, scheme, 0);
}

function supportsTrueColor(): boolean {
	if (process.env.NO_COLOR) return false;
	const colorTerm = process.env.COLORTERM?.toLowerCase();
	if (colorTerm === "truecolor" || colorTerm === "24bit") return true;
	if (process.platform === "win32") return true;
	return Boolean(process.env.WT_SESSION || process.env.TERM_PROGRAM);
}

function shineIntensity(t: number, pos: number, strength: number): number {
	if (strength <= 0) return 0;
	const direct = Math.abs(t - pos);
	const wrapped = Math.min(direct, 1 - direct);
	return Math.max(0, 1 - wrapped / SHINE_HALF_WIDTH) * strength;
}
