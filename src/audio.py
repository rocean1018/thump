import soundfile as sf
import numpy as np



def fourier_from_scratch(signal, sr):
    if signal.ndim == 2:
        signal = signal.mean(axis=1)

    N = len(signal)
    time_indices = np.arange(N) / sr

    frequencies = np.zeros(N // 2 + 1)
    magnitudes = np.zeros(N // 2 + 1)

    for k in range(N // 2 + 1):
        frequency = (k * sr) / N
        frequencies[k] = frequency

        sin_reference = np.sin(2 * np.pi * frequency * time_indices)
        cos_reference = np.cos(2 * np.pi * frequency * time_indices)

        sin_projection = np.dot(signal, sin_reference)
        cos_projection = np.dot(signal, cos_reference)

        magnitudes[k] = np.sqrt(
            sin_projection**2 + cos_projection**2
        )

    return frequencies, magnitudes


def signal_analyzer(signal_filepath):
    signal, sr = sf.read(signal_filepath)
    if signal.ndim == 2: 
            signal = signal.mean(axis=1)
    magnitudes = np.abs(np.fft.rfft(signal))
    frequencies = np.fft.rfftfreq(len(signal), 1/sr)
    return frequencies, magnitudes