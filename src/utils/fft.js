/**
 * Computes the Fast Fourier Transform of a given array of real numbers.
 * Uses a basic Cooley-Tukey Radix-2 algorithm.
 * Output is normalized magnitude spectrum.
 */

export function computeFFTMagnitude(realIn) {
    const N = realIn.length;
    // N must be power of 2
    if ((N & (N - 1)) !== 0) {
        throw new Error("FFT size must be power of 2");
    }

    const real = new Float64Array(realIn);
    const imag = new Float64Array(N);

    // Bit-reverse copy
    let j = 0;
    for (let i = 0; i < N - 1; i++) {
        if (i < j) {
            let tr = real[i];
            real[i] = real[j];
            real[j] = tr;
        }
        let k = N / 2;
        while (k <= j) {
            j -= k;
            k /= 2;
        }
        j += k;
    }

    // Cooley-Tukey
    for (let size = 2; size <= N; size *= 2) {
        let halfSize = size / 2;
        let tabStep = -2.0 * Math.PI / size;
        for (let i = 0; i < N; i += size) {
            for (let k = 0; k < halfSize; k++) {
                let evenIdx = i + k;
                let oddIdx = i + k + halfSize;
                let angle = k * tabStep;
                let t_r = real[oddIdx] * Math.cos(angle) - imag[oddIdx] * Math.sin(angle);
                let t_i = real[oddIdx] * Math.sin(angle) + imag[oddIdx] * Math.cos(angle);

                real[oddIdx] = real[evenIdx] - t_r;
                imag[oddIdx] = imag[evenIdx] - t_i;
                real[evenIdx] += t_r;
                imag[evenIdx] += t_i;
            }
        }
    }

    // Calculate magnitudes for positive frequencies (first half)
    const M = N / 2;
    const magnitudes = new Float64Array(M);
    const normalize = 2.0 / N;

    for (let i = 0; i < M; i++) {
        magnitudes[i] = Math.sqrt(real[i] * real[i] + imag[i] * imag[i]) * normalize;
    }

    return magnitudes;
}
