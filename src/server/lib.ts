import Ajv from "ajv";
import formatsPlugin from "ajv-formats";

export const ajv = new Ajv();
formatsPlugin(ajv);

export enum CountdownMode {
	Duration = "duration",
	EndTime = "end_time",
	Stopwatch = "stopwatch",
	Clock = "clock"
}

export const countdown_title_map: Record<CountdownMode, string> = {
	clock: "Clock",
	stopwatch: "Stopwatch",
	duration: "Countdown (duration)",
	end_time: "Countdown (end time)"
};

export function get_time_string(date: Date): string {
	return [date.getHours(), date.getMinutes(), date.getSeconds()]
		.map((ele) => {
			return String(ele).padStart(2, "0");
		})
		.join(":");
}

export function msleep(n: number) {
	Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, n);
}

export function sleep(n: number) {
	msleep(n * 1000);
}

const random_4_hex = () =>
	Math.floor((1 + Math.random()) * 0x10000)
		.toString(16)
		.substring(1);
export const random_id = () =>
	`${random_4_hex()}-${random_4_hex()}-${random_4_hex()}-${random_4_hex()}`;

export type RequireAtLeastOne<T> = {
	[K in keyof T]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<keyof T, K>>>;
}[keyof T];
