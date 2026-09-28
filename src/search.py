
import numpy as np
from pathlib import Path


from src import features


def find_similar(query_filepath, library_vectors, k=5):
    query_vector = features.sound_vectorize(query_filepath)
    query_path = Path(query_filepath).resolve()

    results = []

    for filepath, vector in library_vectors.items():
        if Path(filepath).resolve() == query_path:
            continue

        distance = np.linalg.norm(query_vector - vector)
        results.append((distance, filepath))

    results.sort(key=lambda result: result[0])

    return results[:k]


def find_similar_cosine(query_filepath, library_vectors, k=5):
    query_vector = features.sound_vectorize(query_filepath)
    query_norm = np.linalg.norm(query_vector)

    results = []

    for filepath, vector in library_vectors.items():
        if Path(filepath).resolve() == Path(query_filepath).resolve():
            continue

        denominator = query_norm * np.linalg.norm(vector)

        if denominator == 0:
            similarity = 0.0
        else:
            similarity = np.dot(query_vector, vector) / denominator

        results.append((similarity, filepath))

    results.sort(key=lambda result: result[0], reverse=True)
    return results[:k]




def find_similar_svd(query_filepath, library_vectors):
    filepaths = list(library_vectors.keys())
    matrix = np.vstack(list(library_vectors.values()))

    mean_vector = np.mean(matrix, axis=0)
    centered_matrix = matrix - mean_vector

    _, singular_values, Vt = np.linalg.svd(
        centered_matrix,
        full_matrices=False
    )

    energy = singular_values ** 2
    cumulative_energy = np.cumsum(energy) / np.sum(energy)
    num_components = np.argmax(cumulative_energy >= 0.9) + 1

    components = Vt[:num_components].T
    latent_matrix = centered_matrix @ components

    query_vector = features.sound_vectorize(query_filepath)
    query_latent = (query_vector - mean_vector) @ components
    query_norm = np.linalg.norm(query_latent)
    query_path = Path(query_filepath).resolve()

    results = []

    for filepath, latent_vector in zip(filepaths, latent_matrix):
        if Path(filepath).resolve() == query_path:
            continue

        denominator = query_norm * np.linalg.norm(latent_vector)

        if denominator == 0:
            similarity = 0.0
        else:
            similarity = np.dot(
                query_latent,
                latent_vector
            ) / denominator

        results.append((similarity, filepath))

    results.sort(key=lambda result: result[0], reverse=True)
    return results[:5]