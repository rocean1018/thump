import hashlib
import tempfile
from pathlib import Path
import streamlit as st


from src import index
from src import search


PROJECT_ROOT = Path(__file__).parent
DEFAULT_LIBRARY = PROJECT_ROOT / "kicks"
CACHE_DIRECTORY = PROJECT_ROOT / ".thump_cache"


def get_index_path(folder_path):
    resolved_path = str(Path(folder_path).expanduser().resolve())
    folder_hash = hashlib.sha256(
        resolved_path.encode("utf-8")
    ).hexdigest()[:12]

    return CACHE_DIRECTORY / f"{folder_hash}.npz"


def load_library(folder_path, rebuild=False):
    folder = Path(folder_path).expanduser().resolve()
    index_path = get_index_path(folder)

    CACHE_DIRECTORY.mkdir(exist_ok=True)

    if rebuild or not index_path.exists():
        library = index.vectorize_folder(folder)

        if not library:
            raise ValueError(
                "No usable WAV files were found in this folder."
            )

        index.save_index(library, index_path)
    else:
        library = index.load_index(index_path)

    return library, index_path


def audio_player(filepath):
    audio_path = Path(filepath)

    if audio_path.exists():
        st.audio(
            audio_path.read_bytes(),
            format="audio/wav"
        )


st.set_page_config(
    page_title="thump",
    page_icon="◉",
    layout="wide"
)

st.markdown(
    """
    <style>
        .stApp {
            background:
                radial-gradient(
                    circle at top left,
                    rgba(146, 70, 255, 0.12),
                    transparent 32rem
                ),
                #0b0b0f;
        }

        .block-container {
            max-width: 1150px;
            padding-top: 3rem;
            padding-bottom: 5rem;
        }

        h1 {
            font-size: 4rem !important;
            letter-spacing: -0.16rem;
            margin-bottom: 0 !important;
        }

        .subtitle {
            color: #9999a8;
            font-size: 1.05rem;
            margin-bottom: 2.5rem;
        }

        [data-testid="stMetric"] {
            background: rgba(255, 255, 255, 0.035);
            border: 1px solid rgba(255, 255, 255, 0.08);
            border-radius: 14px;
            padding: 1rem;
        }

        [data-testid="stSidebar"] {
            background: #101016;
            border-right: 1px solid rgba(255, 255, 255, 0.07);
        }

        .result-name {
            font-size: 1.15rem;
            font-weight: 650;
            margin-bottom: 0.15rem;
        }

        .result-path {
            color: #777784;
            font-size: 0.78rem;
            overflow-wrap: anywhere;
        }

        .rank {
            color: #a970ff;
            font-size: 1.4rem;
            font-weight: 700;
        }
    </style>
    """,
    unsafe_allow_html=True
)

st.title("thump")
st.markdown(
    '<div class="subtitle">'
    "Find the sounds already hiding in your library."
    "</div>",
    unsafe_allow_html=True
)

with st.sidebar:
    st.header("Library")

    library_path = DEFAULT_LIBRARY
    st.write("Using the bundled kick library")

    method = st.selectbox(
        "Search method",
        options=["Cosine", "SVD"],
        help=(
            "Cosine searches the full frequency representation. "
            "SVD searches a compressed latent representation."
        )
    )

    rebuild_index = st.button(
        "Rebuild index",
        use_container_width=True
    )

folder = Path(library_path).expanduser()

if not folder.is_dir():
    st.error("Choose a valid sample-library folder.")
    st.stop()

try:
    with st.spinner(
        "Analyzing samples..."
        if rebuild_index
        else "Loading sample library..."
    ):
        library, saved_index_path = load_library(
            folder,
            rebuild=rebuild_index
        )
except Exception as error:
    st.error(str(error))
    st.stop()

library_key = str(folder.resolve())

if st.session_state.get("library_key") != library_key:
    st.session_state["library_key"] = library_key
    st.session_state.pop("results", None)
    st.session_state.pop("query_path", None)

metric_one, metric_two, metric_three = st.columns(3)

metric_one.metric("Indexed samples", len(library))
metric_two.metric("Frequency bands", 50)
metric_three.metric("Search space", method)

st.divider()

st.subheader("Query")

uploaded_query = st.file_uploader(
    "Upload a WAV sample",
    type=["wav"],
    help="Choose a drum sample to search against the library."
)

if uploaded_query is not None:
    st.caption("Query preview")
    st.audio(
        uploaded_query.getvalue(),
        format="audio/wav"
    )

search_clicked = st.button(
    "Find similar sounds",
    type="primary",
    use_container_width=True,
    disabled=uploaded_query is None
)

if search_clicked and uploaded_query is not None:
    temporary_path = None

    try:
        with tempfile.NamedTemporaryFile(
            suffix=".wav",
            delete=False
        ) as temporary_file:
            temporary_file.write(
                uploaded_query.getbuffer()
            )
            temporary_path = temporary_file.name

        with st.spinner("Searching sound space..."):
            if method == "Cosine":
                results = search.find_similar_cosine(
                    temporary_path,
                    library,
                    k=5
                )
            else:
                results = search.find_similar_svd(
                    temporary_path,
                    library
                )

        st.session_state["results"] = results
        st.session_state["query_name"] = (
            uploaded_query.name
        )
        st.session_state["result_method"] = method

    except Exception as error:
        st.error(f"Search failed: {error}")

    finally:
        if temporary_path is not None:
            Path(temporary_path).unlink(
                missing_ok=True
            )

results = st.session_state.get("results")

if results:
    st.divider()
    st.subheader("Closest matches")

    for rank, (score, filepath) in enumerate(
        results,
        start=1
    ):
        with st.container(border=True):
            rank_column, info_column, score_column = st.columns(
                [0.08, 0.67, 0.25]
            )

            with rank_column:
                st.markdown(
                    f'<div class="rank">{rank:02}</div>',
                    unsafe_allow_html=True
                )

            with info_column:
                st.markdown(
                    f'<div class="result-name">'
                    f"{Path(filepath).name}"
                    f"</div>",
                    unsafe_allow_html=True
                )

            with score_column:
                st.metric(
                    "Similarity",
                    f"{float(score):.3f}"
                )

            audio_player(filepath)

with st.sidebar:
    st.divider()
    st.caption(f"Index: {saved_index_path.name}")