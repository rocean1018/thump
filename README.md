## What Thump does:

Thump is an audio-sample similarity search engine focused on kick drums. A user uploads a WAV file and receives the five most acoustically similar samples from an indexed library. Similarity is based on the frequency content of each sample. This project serves as a connection between Fourier analysis, vector similarity, and singular value decomposition to a practical audio problem. The main goal was to understand and implement the mathematics of Fourier analysis before building a full interface.

## Motivation:

Producers in the music industry often struggle with sound selection; large sound libraries can make it difficult to find a sample with a specific sound. Filenames often provide very little useful information about a sample's acoustic character. Thump solves this problem by searching by sound, not through filename or manually assigned labels.

Starting with kicks makes the problem more precise: the program must distinguish subtle differences within the same instrument category. This project explores whether mathematical similarity agrees with perceived audio similarity.

## How it works:

1. Load the WAV file with soundfile. 
2. Convert stereo audio to mono by averaging it's channels.
3. Apply a real-valued fast Fourier transform.
4. Calculate the magnitude of each Fourier coefficient.
5. Divide 20 Hz–20 kHz into 50 logarithmically spaced frequency bands.
6. Sum the squared Fourier magnitudes within each band.
7. Normalize the resulting energy vector so its coordinates sum to one.
8. Compare the query vector with the indexed library vectors.
9. Rank the samples and return the five closest matches.

## Fourier analysis:

A sampled audio signal can be represented as a vector in $\mathbb{R}^N$. Fourier analysis measures the signal's projections onto sine and cosine directions. Both sine and cosine directions are required because a signal's phase changes how it projects onto each direction, and choosing only one could omit valuable information about samples. Combining the two frequency coefficients gives a phase-insensitive frequency magnitude. 

A from-scratch Fourier implementation was created first using dot products, and its results were compared with numpy.fft.rfft to ensure mathematical correctness. The final application utilizes the FFT because it is substantially faster for real audio. The from-scratch function implementation remains in the project in index.py under the name fourier_from_scratch to demonstrate the underlying mathematics.

## Feature extraction

Each sample is represented by a 50-dimensional feature vector. These 50 dimensions represent frequency bands spaced logarithmically between 20 Hz and 20 kHz. Logarithmic spacing provides more detail at low frequencies than equal-width bands. This is especially useful for kicks because much of their important frequency content is in the bass range. Each coordinate records the energy in one band, and dividing by total energy reduces the effect of differences in original sample volume. The resulting representation describes the relative distribution of spectral energy in a given audio sample.

## Cosine and SVD search:

Cosine similarity compares the direction of the two feature vectors. A score near 1 means the samples have similar spectral-energy distributions, and a score near 0 means they have very little energy similarity. Cosine similarity performed better by ear than Euclidean distance during informal testing. The full 50-band search is retained as the main baseline because the method is simple, interpretable, and does not require fitting a model.

SVD similarity is a bit more nuanced. The library vectors are stacked as rows of a feature matrix, and the main feature vector is subtracted to center the matrix. Singular value decomposition finds orthogonal directions that capture variation across the library. The application keeps enough components/features to retain at least 90% of squared singular-value energy. Both the library and query are projected onto this lower-dimensional latent space. Cosine similarity is then calculated between latent vectors. The purpose of SVD is to reduce redundant/unnecessary dimensions while preserving much of the library's structure. It's results are slightly different from full-vector cosine search, but results produce useful matches.

## Indexing and Caching

Every library WAV is analyzed and stored with it's normalized feature vector. The index maps filepaths to their corresponding vectors. The index is saved as a compressed NumPy .npz file, and future searches can load the saved index instead of recalculating every FFT. A rebuild option is available when samples or feature-extraction logic change. The Streamlit interface stores new indexes in .thump_cache. 

## Interface:

The interface is built with Streamlit, and the bundled kick library is indexed automatically. Users upload a WAV query through the browser, and the file is temporarily saved so the existing analysis pipeline can process it. The temporary file is removed after the search, and the interface displays five ranked results with similarity scores.

## Installation: 

Thump requires Python 3.10 or newer. After downloading or cloning the repository, open a terminal in the project directory and create a virtual environment:
python -m venv .venv
Activate the environment on macOS or Linux:
source .venv/bin/activate
Then install the required packages:
python -m pip install -r requirements.txt
The main dependencies are NumPy for numerical operations, SoundFile for reading WAV files, and Streamlit for the user interface.

## Running the Application:

Start the Streamlit application from the project root:
python -m streamlit run ui.py
Streamlit will display a local address in the terminal and usually open it automatically in a browser. Upload a WAV sample, preview it, select either cosine or SVD search, and press Find similar sounds. Thump will return five matches with similarity scores and audio players.
The first run may take longer because Thump must analyze and index the bundled sample library. Later runs load the saved index from the cache.

## Command-Line Usage:

Thump can also run without the graphical interface. Supply a sample-library folder and query file to main.py:
python main.py \
  --library "/path/to/kicks" \
  --query "/path/to/query.wav"
The command prints the five closest filenames and their similarity scores.
After adding samples or changing the feature-extraction algorithm, rebuild the index:
python main.py \
  --library "/path/to/kicks" \
  --query "/path/to/query.wav" \
  --rebuild-index
Project Structure
main.py is the command-line entry point, while ui.py contains the Streamlit interface. The src/audio.py module loads audio, converts stereo signals to mono, computes FFT data, and contains the educational Fourier implementation. The src/features.py module converts each sample into a normalized frequency-band vector.
Library indexing and index persistence are handled by src/index.py. The Euclidean, cosine, and SVD retrieval methods are implemented in src/search.py. The kicks directory contains the searchable sample library, and requirements.txt lists the Python dependencies.
 
## Results and Observations:

The first version represented each sample using seven broad frequency bands. That representation captured general bass balance but discarded too much spectral detail. In particular, it sometimes treated clean and heavily distorted kicks as similar because their total energy proportions were alike.
Increasing the representation to 50 logarithmically spaced bands produced better results. The additional bands preserved more harmonic and high-frequency detail while maintaining greater resolution in the bass range.
In informal listening tests, cosine similarity generally produced more convincing results than Euclidean distance. SVD reduced the feature space to a small number of latent dimensions while continuing to return useful matches. Its rankings were slightly different from those of the complete 50-band representation, showing that compression removed some distinctions while emphasizing others.
These experiments also showed that retaining a high percentage of squared singular-value energy does not automatically guarantee better perceptual similarity. Listening remains necessary when evaluating an audio-retrieval system.

## Limitations:

Thump analyzes the FFT of an entire sample, so it describes overall frequency content without recording when each frequency occurs. It cannot directly distinguish whether high-frequency energy belongs to the initial transient or continues throughout the sample’s decay.
Attack shape, duration, amplitude envelope, and pitch movement are not explicitly represented. Two kicks with similar overall spectra but different timing characteristics may therefore be ranked closely.
Perceived similarity is also subjective. The current evaluation is based on informal listening with a relatively small kick library rather than a large blind study. The index must be rebuilt whenever the feature algorithm or sample library changes.
Any samples included in a public deployment must also have licenses that permit redistribution.

## Future Improvements:

A future version could add temporal features describing transient strength, duration, decay, and amplitude envelope. A short-time Fourier transform could represent how the frequency spectrum changes over the course of a sample rather than reducing the entire recording to one spectrum.
Retrieval quality could be evaluated through blind listening tests involving more queries and listeners. Additional experiments could compare different numbers of frequency bands, different SVD dimensions, and perceptually motivated representations such as mel-spaced bands.
The index could store metadata about its feature settings and source files, allowing Thump to detect automatically when rebuilding is necessary. The application could eventually support snares, hats, and other sound categories or allow users to upload and index their own sample libraries.

