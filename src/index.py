from pathlib import Path

from src import features

def vectorize_folder(folder_path):
    library_vectors = {}

    for filepath in Path(folder_path).rglob("*"):
        if filepath.is_file() and filepath.suffix.lower() == ".wav":
            try:
                library_vectors[str(filepath)] = features.sound_vectorize(str(filepath))
            except Exception as error:
                print(f"Could not process {filepath}: {error}")

    return library_vectors

import numpy as np


def save_index(library_vectors, index_path):
    if not library_vectors:
        raise ValueError("Cannot save an empty library index.")

    filepaths = np.array(list(library_vectors.keys()))
    vectors = np.vstack(list(library_vectors.values()))

    np.savez_compressed(
        index_path,
        filepaths=filepaths,
        vectors=vectors
    )


def load_index(index_path):
    with np.load(index_path, allow_pickle=False) as data:
        filepaths = data["filepaths"]
        vectors = data["vectors"]

    return {
        str(filepath): vector
        for filepath, vector in zip(filepaths, vectors)
    }
    