use wasm_bindgen::prelude::*;
use js_sys::{Uint8Array, Uint32Array};
use std::cmp::{max, min};

#[wasm_bindgen]
pub fn binary_and(a: &mut [u8], b: &[u8]) {
    assert_eq!(a.len(), b.len());

    #[cfg(target_feature = "simd128")]
    {
        use core::arch::wasm32::*;
        unsafe {
            let chunks = a.len() / 16;
            for i in 0..chunks {
                let offset = i * 16;
                let va = v128_load(a[offset..].as_ptr() as *const v128);
                let vb = v128_load(b[offset..].as_ptr() as *const v128);
                let vc = v128_and(va, vb);
                v128_store(a[offset..].as_mut_ptr() as *mut v128, vc);
            }
            for i in (chunks * 16)..a.len() {
                a[i] &= b[i];
            }
        }
    }

    #[cfg(not(target_feature = "simd128"))]
    {
        for i in 0..a.len() {
            a[i] &= b[i];
        }
    }
}

#[wasm_bindgen]
pub fn binary_or(a: &mut [u8], b: &[u8]) {
    assert_eq!(a.len(), b.len());

    #[cfg(target_feature = "simd128")]
    {
        use core::arch::wasm32::*;
        unsafe {
            let chunks = a.len() / 16;
            for i in 0..chunks {
                let offset = i * 16;
                let va = v128_load(a[offset..].as_ptr() as *const v128);
                let vb = v128_load(b[offset..].as_ptr() as *const v128);
                let vc = v128_or(va, vb);
                v128_store(a[offset..].as_mut_ptr() as *mut v128, vc);
            }
            for i in (chunks * 16)..a.len() {
                a[i] |= b[i];
            }
        }
    }

    #[cfg(not(target_feature = "simd128"))]
    {
        for i in 0..a.len() {
            a[i] |= b[i];
        }
    }
}

#[wasm_bindgen]
pub fn binary_invert(a: &mut [u8]) {
    #[cfg(target_feature = "simd128")]
    {
        use core::arch::wasm32::*;
        unsafe {
            let chunks = a.len() / 16;
            let ones = u8x16_splat(0xFF);
            for i in 0..chunks {
                let offset = i * 16;
                let va = v128_load(a[offset..].as_ptr() as *const v128);
                let vc = v128_xor(va, ones);
                v128_store(a[offset..].as_mut_ptr() as *mut v128, vc);
            }
            for i in (chunks * 16)..a.len() {
                a[i] = !a[i];
            }
        }
    }

    #[cfg(not(target_feature = "simd128"))]
    {
        for x in a.iter_mut() {
            *x = !*x;
        }
    }
}

#[wasm_bindgen]
pub fn binary_buffer(input: &[u8], width: usize, height: usize, radius: usize) -> Uint8Array {
    let mut output = vec![0u8; width * height];

    // Collect coordinates of all `1`s
    let mut ones = Vec::with_capacity(input.iter().filter(|&&x| x == 1).count());
    for y in 0..height {
        for x in 0..width {
            if input[y * width + x] == 1 {
                ones.push((x, y));
            }
        }
    }

    // Stamp blocks for each `1`
    for &(x, y) in &ones {
        let x0 = x.saturating_sub(radius);
        let y0 = y.saturating_sub(radius);
        let x1 = (x + radius + 1).min(width);
        let y1 = (y + radius + 1).min(height);

        for ny in y0..y1 {
            let row_start = ny * width;
            for nx in x0..x1 {
                output[row_start + nx] = 1;
            }
        }
    }

    // Remove original `1`s
    for &(x, y) in &ones {
        output[y * width + x] = 0;
    }

    Uint8Array::from(&output[..])
}

#[wasm_bindgen]
pub fn binary_and_unpack_simd(a: &[u8], b: &[u8]) -> Uint8Array {
    assert_eq!(a.len(), b.len());
    let mut result = vec![0u8; a.len() * 8];

    #[cfg(target_feature = "simd128")]
    unsafe {
        use core::arch::wasm32::*;
        let chunks = a.len() / 16;
        for i in 0..chunks {
            let offset = i * 16;
            let va = v128_load(a[offset..].as_ptr() as *const v128);
            let vb = v128_load(b[offset..].as_ptr() as *const v128);
            let vc = v128_and(va, vb);

            let mut tmp = [0u8; 16];
            v128_store(tmp.as_mut_ptr() as *mut v128, vc);

            for j in 0..16 {
                for bit in 0..8 {
                    result[(offset + j) * 8 + bit] = (tmp[j] >> (7 - bit)) & 1;
                }
            }
        }

        for i in (chunks * 16)..a.len() {
            let byte = a[i] & b[i];
            for bit in 0..8 {
                result[i * 8 + bit] = (byte >> (7 - bit)) & 1;
            }
        }
    }

    #[cfg(not(target_feature = "simd128"))]
    {
        for (i, (&byte_a, &byte_b)) in a.iter().zip(b).enumerate() {
            let byte = byte_a & byte_b;
            for bit in 0..8 {
                result[i * 8 + bit] = (byte >> (7 - bit)) & 1;
            }
        }
    }

    Uint8Array::from(&result[..])
}

#[wasm_bindgen]
pub fn categorical_count_masked(c: &[u16], b: &[u8], max_value: u16) -> Uint32Array {
    assert_eq!(c.len(), b.len(), "Arrays must have equal length");
    let mut counts = vec![0u32; (max_value + 1) as usize];
    for i in 0..c.len() {
        if b[i] == 1 {
            let val = c[i];
            if val <= max_value {
                counts[val as usize] += 1;
            }
        }
    }
    Uint32Array::from(&counts[..])
}

#[wasm_bindgen]
pub fn unpack_bitmask(bitpacked: &[u8], pixel_count: usize) -> Uint8Array {
    let mut result = vec![0u8; pixel_count];
    for i in 0..pixel_count {
        let byte_index = i / 8;
        let bit_index = 7 - (i % 8);
        result[i] = (bitpacked[byte_index] >> bit_index) & 1;
    }
    Uint8Array::from(&result[..])
}

#[wasm_bindgen]
pub fn categorical_matrix(c1: &[u16], c2: &[u16], max_row: u16, max_col: u16) -> Uint32Array {
    assert_eq!(c1.len(), c2.len(), "Arrays must have equal length");
    let mut matrix = vec![0u32; ((max_row as usize + 1) * (max_col as usize + 1))];
    for i in 0..c1.len() {
        let r = c1[i] as usize;
        let c = c2[i] as usize;
        if r <= max_row as usize && c <= max_col as usize {
            matrix[r * (max_col as usize + 1) + c] += 1;
        }
    }
    Uint32Array::from(&matrix[..])
}

#[wasm_bindgen]
pub fn categorical_matrix_simd(c1: &[u16], c2: &[u16], max_row: u16, max_col: u16) -> Uint32Array {
    assert_eq!(c1.len(), c2.len(), "Arrays must have equal length");
    let mut matrix = vec![0u32; ((max_row as usize + 1) * (max_col as usize + 1))];
    let len = c1.len();

    #[cfg(target_feature = "simd128")]
    unsafe {
        use core::arch::wasm32::*;
        let mut i = 0;
        while i + 7 < len {
            let rows = v128_load(c1[i..].as_ptr() as *const v128);
            let cols = v128_load(c2[i..].as_ptr() as *const v128);

            let mut r_tmp = [0u16; 8];
            let mut c_tmp = [0u16; 8];
            v128_store(r_tmp.as_mut_ptr() as *mut v128, rows);
            v128_store(c_tmp.as_mut_ptr() as *mut v128, cols);

            for j in 0..8 {
                let r = r_tmp[j] as usize;
                let c = c_tmp[j] as usize;
                if r <= max_row as usize && c <= max_col as usize {
                    matrix[r * (max_col as usize + 1) + c] += 1;
                }
            }

            i += 8;
        }

        for j in i..len {
            let r = c1[j] as usize;
            let c = c2[j] as usize;
            if r <= max_row as usize && c <= max_col as usize {
                matrix[r * (max_col as usize + 1) + c] += 1;
            }
        }
    }

    #[cfg(not(target_feature = "simd128"))]
    {
        for i in 0..len {
            let r = c1[i] as usize;
            let c = c2[i] as usize;
            if r <= max_row as usize && c <= max_col as usize {
                matrix[r * (max_col as usize + 1) + c] += 1;
            }
        }
    }

    Uint32Array::from(&matrix[..])
}
