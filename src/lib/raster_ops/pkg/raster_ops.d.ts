/* tslint:disable */
/* eslint-disable */
export function binary_and(a: Uint8Array, b: Uint8Array): void;
export function binary_or(a: Uint8Array, b: Uint8Array): void;
export function binary_invert(a: Uint8Array): void;
export function binary_buffer(input: Uint8Array, width: number, height: number, radius: number): Uint8Array;
export function binary_and_unpack_simd(a: Uint8Array, b: Uint8Array): Uint8Array;
export function categorical_count_masked(c: Uint16Array, b: Uint8Array, max_value: number): Uint32Array;
export function unpack_bitmask(bitpacked: Uint8Array, pixel_count: number): Uint8Array;
export function categorical_matrix(c1: Uint16Array, c2: Uint16Array, max_row: number, max_col: number): Uint32Array;
export function categorical_matrix_simd(c1: Uint16Array, c2: Uint16Array, max_row: number, max_col: number): Uint32Array;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly binary_and: (a: number, b: number, c: any, d: number, e: number) => void;
  readonly binary_or: (a: number, b: number, c: any, d: number, e: number) => void;
  readonly binary_invert: (a: number, b: number, c: any) => void;
  readonly binary_buffer: (a: number, b: number, c: number, d: number, e: number) => any;
  readonly binary_and_unpack_simd: (a: number, b: number, c: number, d: number) => any;
  readonly categorical_count_masked: (a: number, b: number, c: number, d: number, e: number) => any;
  readonly unpack_bitmask: (a: number, b: number, c: number) => any;
  readonly categorical_matrix: (a: number, b: number, c: number, d: number, e: number, f: number) => any;
  readonly categorical_matrix_simd: (a: number, b: number, c: number, d: number, e: number, f: number) => any;
  readonly __wbindgen_export_0: WebAssembly.Table;
  readonly __wbindgen_malloc: (a: number, b: number) => number;
  readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;
/**
* Instantiates the given `module`, which can either be bytes or
* a precompiled `WebAssembly.Module`.
*
* @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
*
* @returns {InitOutput}
*/
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
* If `module_or_path` is {RequestInfo} or {URL}, makes a request and
* for everything else, calls `WebAssembly.instantiate` directly.
*
* @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
*
* @returns {Promise<InitOutput>}
*/
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
