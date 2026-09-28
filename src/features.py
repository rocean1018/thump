import numpy as np


from src import audio


def sound_vectorize(filepath, num_bands=50):
    frequencies, magnitudes = audio.signal_analyzer(filepath)

    band_edges = np.geomspace(20, 20000, num_bands + 1)
    sound_vector = np.zeros(num_bands)

    for i in range(num_bands):
        low = band_edges[i]
        high = band_edges[i + 1]

        band_mask = (frequencies >= low) & (frequencies < high)
        sound_vector[i] = np.sum(magnitudes[band_mask] ** 2)

    total_energy = np.sum(sound_vector)

    if total_energy == 0:
        raise ValueError(f"No energy found between 20 Hz and 20 kHz: {filepath}")

    return sound_vector / total_energy