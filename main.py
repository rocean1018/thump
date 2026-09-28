import argparse
from pathlib import Path

from src import index
from src import search


def run_search(folder_path, query_path, index_path, rebuild_index):
    index_file = Path(index_path)

    if index_file.exists() and not rebuild_index:
        print(f"Loading index: {index_file}")
        library = index.load_index(index_file)
    else:
        print(f"Building index from: {folder_path}")
        library = index.vectorize_folder(folder_path)
        index.save_index(library, index_file)
        print(f"Saved index: {index_file}")

    results = search.find_similar_svd(
        query_path,
        library
    )

    for rank, (score, filepath) in enumerate(
        results,
        start=1
    ):
        print(
            f"{rank}. {Path(filepath).name} "
            f"({score:.4f})"
        )


def parse_arguments():
    parser = argparse.ArgumentParser(
        description="Find acoustically similar drum samples."
    )

    parser.add_argument(
        "--library",
        required=True,
        help="Folder containing WAV samples."
    )

    parser.add_argument(
        "--query",
        required=True,
        help="WAV sample to search for."
    )

    parser.add_argument(
        "--index",
        default="library_index.npz",
        help="Path to the saved library index."
    )
    
    parser.add_argument(
        "--rebuild-index",
        action="store_true",
        help="Rebuild the saved library index."
    )

    return parser.parse_args()


if __name__ == "__main__":
    args = parse_arguments()

    run_search(
        args.library,
        args.query,
        args.index,
        args.rebuild_index
    )