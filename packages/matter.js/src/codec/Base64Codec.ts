/**
 * @license
 * Copyright 2022-2023 Project CHIP Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { ByteArray } from "../util/ByteArray.js";

const A2B = <number[]>[];
const B2A = new ByteArray(64);
const B2A_URL = new ByteArray(64);
const PAD = "=".codePointAt(0)!;

{
    let pos = 0;

    function addRange(start: string, stop: string) {
        const end = stop.codePointAt(0)! + 1;
        for (let i = start.codePointAt(0)!; i < end; i++) {
            A2B[i] = pos;
            B2A[pos++] = i;
        }
    }
    addRange('A', 'Z');
    addRange('a', 'z');
    addRange('0', '9');
    addRange('+', '+');
    addRange('/', '/');

    // base64url
    const slashValue = A2B["/".codePointAt(0)!];
    const plusValue = A2B["+".codePointAt(0)!];
    A2B["_".codePointAt(0)!] = slashValue;
    A2B["-".codePointAt(0)!] = plusValue;
    B2A_URL.set(B2A);
    B2A_URL[slashValue] = "_".codePointAt(0)!;
    B2A_URL[plusValue] = "-".codePointAt(0)!;
}

export namespace Base64 {
    /**
     * Encodes base64.
     * 
     * @param input an indexable sequence of bytes
     * @param url set to true to encode as base46url
     * @returns an encoded string
     */
    export function encode(input: ArrayLike<number>, url = false) {
        const dict = url ? B2A_URL : B2A;
        let outLength = Math.trunc(input.length / 3) * 4;
        if (url) {
            const partial = input.length % 3;
            if (partial) outLength += partial + 1;
        } else {
            outLength += input.length % 3 ? 4 : 0;
        }
        const out = new ByteArray(outLength);

        for (let inPos = 0, outPos = 0; outPos < outLength;) {
            const n = (input[inPos++] << 16) + ((input[inPos++] ?? 0) << 8) + (input[inPos++] ?? 0);

            out[outPos++] = dict[n >>> 18];
            out[outPos++] = dict[n >>> 12 & 0o77];

            if (inPos - input.length === 2) {
                if (!url) out[outPos++] = PAD;
            } else {
                out[outPos++] = dict[n >>> 6 & 0o77];
            }

            if (inPos > input.length) {
                if (!url) out[outPos++] = PAD;
            } else {
                out[outPos++] = dict[n & 0o77];
            }
        }

        return new TextDecoder("iso-8859-1").decode(out);
    }

    /**
     * Decodes base64.
     * 
     * @param input binary data encoded as a base64 or base64url string
     * @returns decoded bytes in a ByteArray
     */
    export function decode(input: string) {
        if (!input.length) {
            return new ByteArray();
        }

        let inputLength = input.length;
        while (input.codePointAt(inputLength - 1) === PAD) inputLength--;

        let outLength = Math.trunc(inputLength / 4) * 3;
        switch (inputLength % 4) {
            case 3: outLength += 2; break;
            case 2: outLength += 1; break;
            case 1: throw new Error("Invalid base-64 encoding");
        }

        const out = new ByteArray(outLength);

        for (let inPos = 0, outPos = 0; ;) {
            function lookup() {
                if (inPos >= inputLength) return 0;
                let v = A2B[input.codePointAt(inPos++)!];
                if (v === undefined) {
                    throw new Error("Invalid base-64 encoding");
                }
                return v;
            }

            let n = (lookup() << 18) + (lookup() << 12) + (lookup() << 6) + lookup();
            out[outPos++] = n >>> 16;
            if (outPos < outLength) {
                out[outPos++] = n >>> 8 & 0xff;
            } else {
                break;
            }
            if (outPos < outLength) {
                out[outPos++] = n & 0xff;
            } else {
                break;
            }
        }

        return out;
    }
}
