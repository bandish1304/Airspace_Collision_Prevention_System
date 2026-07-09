# Airspace Collision Prevention System — Build Steps

---

## PHASE 1 — ML/DL End-to-End Pipeline

---

### WEEK 1 — Project Setup + ADS-B Data Ingestion
**Discipline: Data Engineering + Software Engineering**
**Estimated time: 4–5 hours**

#### What you are doing
You are setting up the entire project foundation. This week is about creating a clean, professional project structure and getting real aircraft data flowing into your system for the first time.

#### Steps

1. Create a new GitHub repository called `airspace-collision-prevention`. Initialize it with a README and a `.gitignore` for Python.

2. Clone the repo to your local machine and open it in VSCode.

3. Create the following folder structure inside your project:
   - `/data/raw` — stores raw ADS-B JSON files downloaded from OpenSky
   - `/data/processed` — stores cleaned, feature-engineered DataFrames
   - `/models` — stores trained model files and ONNX exports
   - `/src` — all your Python source code modules
   - `/src/data` — data ingestion and validation scripts
   - `/src/features` — feature engineering scripts
   - `/src/models` — model training and evaluation scripts
   - `/src/api` — FastAPI application code
   - `/tests` — all test files
   - `/notebooks` — Jupyter notebooks for EDA and experimentation
   - `/api` — FastAPI app entry point
   - `requirements.txt` — all Python dependencies
   - `.env.example` — template for environment variables (no real secrets)
   - `docker-compose.yml` — will be filled in Week 5

4. Create a Python virtual environment inside the project folder and activate it.

5. Install your core Week 1 dependencies: `pandas`, `numpy`, `requests`, `python-dotenv`, `mlflow`, `scikit-learn`, `jupyter`. Save them to `requirements.txt`.

6. Create a `.env` file (never commit this to GitHub) and store your OpenSky Network credentials there. Create a free account at opensky-network.org to get higher rate limits.

7. Write a data ingestion script inside `/src/data/` that connects to the OpenSky Network REST API. The API endpoint is `/api/states/all` and it returns the current position, altitude, speed, heading, and callsign of every aircraft currently broadcasting ADS-B. Pull data for a bounding box over Southern California (roughly lat 32–36, lon -120 to -115) to keep the dataset manageable.

8. Immediately save every API response as a raw JSON file to `/data/raw/` with a timestamp in the filename. Never re-fetch what you already have. This protects you from hitting rate limits during development.

9. Write a second script that loads those raw JSON files and converts them into a clean Pandas DataFrame with properly typed columns: callsign (string), latitude (float), longitude (float), altitude (float, in feet), velocity (float, in knots), heading (float, in degrees), vertical rate (float), and timestamp (datetime).

10. Download the NTSB accident database CSV file from ntsb.gov. This is a free public download. Load it into a Pandas DataFrame and look at its columns — you want the narrative text, aircraft type, phase of flight, and cause codes. Save a cleaned version to `/data/processed/ntsb_clean.csv`.

11. Set up MLflow locally by running `mlflow ui` in your terminal. Open the MLflow dashboard in your browser at localhost:5000. Create a new experiment called `collision-risk-models`. Log a single dummy run with one fake metric just to confirm MLflow is working correctly.

12. Write a basic data validation function that rejects any ADS-B record where latitude or longitude is null, where speed exceeds 1500 knots (physically impossible for civilian aircraft), where altitude is negative, or where callsign is missing. Log how many records were rejected each time you run ingestion.

13. Commit everything to GitHub with a clear commit message.

---

### WEEK 2 — Feature Engineering + Class Imbalance
**Discipline: Data Engineering + Machine Learning**
**Estimated time: 4–5 hours**

#### What you are doing
You are turning raw aircraft positions into meaningful ML features. You are also confronting the biggest data challenge in this project — collisions are extremely rare, so your dataset is massively imbalanced. You fix that here before training a single model.

#### Steps

1. Write a function that takes two aircraft records and computes the haversine distance between them in nautical miles. The haversine formula calculates great-circle distance between two latitude/longitude points on a sphere. This is your most important feature.

2. Write a function that computes the closing speed between two aircraft — the rate at which the haversine distance between them is decreasing over time. A positive closing speed means they are getting closer. Compute this by comparing distances across two consecutive time steps.

3. Write a function that computes the bearing difference between two aircraft — the absolute difference in their headings in degrees. Two aircraft flying toward each other have a bearing difference close to 180 degrees. This is a strong collision predictor.

4. Write a function that computes the vertical separation between two aircraft — the absolute difference in their altitudes in feet. ICAO requires 1000 feet of vertical separation at cruise altitude.

5. Write a function that computes the time to closest point of approach (time-to-CPA). To do this, project each aircraft forward in space using its current velocity and heading over the next 10 minutes in small time steps. Find the future time step where the distance between them is smallest. That time is the CPA. The distance at that moment is the CPA distance.

6. Generate all pairs of aircraft within a 50 nautical mile radius of each other. For every pair, compute all five features above: haversine distance, closing speed, bearing difference, vertical separation, and time-to-CPA.

7. Label each aircraft pair. A pair is labeled as collision risk (positive class, label = 1) if any of the following are true: horizontal separation is below 5 nautical miles AND vertical separation is below 1000 feet, OR time-to-CPA is below 5 minutes AND projected CPA distance is below 3 nautical miles. All other pairs are labeled safe (negative class, label = 0).

8. Analyze your class distribution. Count how many positive examples (collision risk) versus negative examples (safe) you have. In real ADS-B data, collision risk pairs are typically less than 1% of all pairs. Print and log this ratio to MLflow. This imbalance is the core data challenge of this project.

9. Apply SMOTE (Synthetic Minority Oversampling Technique) from the `imbalanced-learn` library to your training set only — never to your validation or test sets. SMOTE creates synthetic examples of the minority class by interpolating between existing minority examples. This balances the training set.

10. Also implement a second approach: compute class weights for your model so that misclassifying a collision risk example (false negative) is penalized 10 times more than misclassifying a safe example (false positive). This reflects the real-world asymmetry — missing a collision is catastrophic.

11. Split your dataset into training (70%), validation (15%), and test (15%) sets. Make sure the split is stratified — meaning the ratio of positive to negative examples is preserved in each split. Never shuffle your test set into training data.

12. Save your final feature matrix and labels to `/data/processed/features_train.csv`, `features_val.csv`, and `features_test.csv`.

13. Log the class distribution, feature statistics, and SMOTE parameters to a new MLflow run called `data-preparation-v1`.

---

### WEEK 3 — XGBoost Baseline + Evaluation Harness
**Discipline: Machine Learning + MLOps**
**Estimated time: 4–5 hours**

#### What you are doing
You are training your first collision risk prediction model and building the evaluation framework that every future model will be measured against. The evaluation harness is as important as the model itself — it is what makes your results credible.

#### Steps

1. Build a scikit-learn preprocessing pipeline that applies StandardScaler to normalize your numerical features. Wrap this in a scikit-learn `Pipeline` object so that preprocessing and model training happen as a single unit. This prevents data leakage — the scaler fits only on training data and transforms validation and test data using training statistics.

2. Train an XGBoost classifier on your preprocessed training features. Start with default hyperparameters. The model outputs a probability score between 0 and 1 for each aircraft pair, where higher means more collision risk.

3. Log this first run to MLflow — include the model hyperparameters, training time, and a note saying this is the default baseline.

4. Build your evaluation harness as a reusable Python function that accepts a trained model, features, and labels and returns a full set of metrics. This function will be called identically for every model you train from this point on. It must compute: AUROC (area under the ROC curve), F1 score, precision, recall, and a confusion matrix.

5. Add AUROC explanation to your notebook: AUROC measures how well the model separates collision risk pairs from safe pairs across all possible decision thresholds. A score of 0.5 is random. A score of 1.0 is perfect. Anything above 0.85 is strong for this problem.

6. Plot the precision-recall curve for your XGBoost model. This is more informative than ROC for imbalanced datasets. A high area under the precision-recall curve means the model finds most collision risks without flooding the system with false alarms.

7. Implement cost-sensitive threshold tuning. Instead of using the default 0.5 decision threshold, search across thresholds from 0.1 to 0.9 and find the threshold that minimizes a cost function where false negatives cost 5 times more than false positives. This is the threshold you will use in deployment.

8. Plot feature importance from XGBoost. This tells you which of your engineered features the model considers most predictive. Time-to-CPA and closing speed should rank highly. If haversine distance ranks highest, that is expected. If vertical rate ranks at the bottom, that is also normal. Log this plot to MLflow.

9. Run Optuna hyperparameter optimization. Define an objective function that trains XGBoost with different combinations of `n_estimators`, `max_depth`, `learning_rate`, and `subsample` and returns the validation AUROC. Run 30 trials. Log every trial as a separate MLflow run so you can compare them in the dashboard.

10. Take the best hyperparameters from Optuna and re-train your final XGBoost model on the full training set.

11. Evaluate the final XGBoost model on the test set using your evaluation harness. Log all metrics to MLflow. This is your official baseline result — write it down somewhere because every future model must beat it.

12. Register the final XGBoost model in the MLflow model registry under the name `collision-risk-v1` with the stage set to `Staging`.

---

### WEEK 4 — LSTM Trajectory Model + Ensemble + ONNX Export
**Discipline: Deep Learning + MLOps**
**Estimated time: 5–6 hours**

#### What you are doing
You are building a deep learning model that understands aircraft trajectories as sequences over time, rather than as single snapshots. Then you are combining it with XGBoost into an ensemble and optimizing both models for fast inference.

#### Steps

1. Convert your ADS-B data into time-series sequences. For each aircraft pair, instead of a single row of features, create a sequence of the last 10 consecutive time steps. Each time step contains the same five features: distance, closing speed, bearing difference, vertical separation, and time-to-CPA. The label is whether a collision risk exists at the end of that sequence.

2. Write a PyTorch `Dataset` class that loads these sequences. The `__getitem__` method returns one sequence (a tensor of shape 10 × 5) and its label. Handle variable-length sequences by padding shorter ones to length 10 with zeros and storing the actual length so the LSTM can ignore padding.

3. Create PyTorch `DataLoader` objects for training, validation, and test sets. Use a batch size of 64. Shuffle the training loader but not the validation or test loaders.

4. Build your LSTM model in PyTorch. The architecture is: an LSTM layer with 2 stacked layers and a hidden size of 128, followed by a dropout layer with rate 0.3, followed by a linear layer that maps the final hidden state to a single output, followed by a sigmoid activation that converts the output to a probability between 0 and 1.

5. Set up your training loop. Use focal loss as your loss function — this is the same loss you considered in Week 2, and it automatically handles class imbalance by reducing the weight of easy examples and focusing on hard ones. Use Adam as your optimizer with a learning rate of 0.001. Add a learning rate scheduler that reduces the learning rate by half if validation loss does not improve for 3 epochs. Add early stopping that stops training if validation loss does not improve for 7 epochs.

6. Train the LSTM for up to 50 epochs, evaluating on the validation set after each epoch. Log training loss, validation loss, and validation AUROC to MLflow after every epoch.

7. Evaluate the best LSTM checkpoint on the test set using your same evaluation harness from Week 3. Compare its AUROC, F1, and cost-sensitive metric against XGBoost. Log everything to MLflow with the run name `lstm-v1`.

8. Build a simple ensemble by averaging the probability scores from XGBoost and LSTM. You can weight them equally to start. Evaluate the ensemble on the test set. The ensemble should beat both individual models on AUROC — if it does not, try weighting the better individual model at 0.6 and the weaker one at 0.4.

9. Export your LSTM model to ONNX format using `torch.onnx.export`. Make sure you set dynamic axes for the batch size dimension so the exported model can handle any batch size. Save the ONNX file to `/models/lstm_v1.onnx`.

10. Load the ONNX model using ONNX Runtime and verify that its predictions match the original PyTorch model predictions on the same inputs. They should be identical to within floating point precision.

11. Apply INT8 quantization to the ONNX model using ONNX Runtime's quantization tools. This reduces the model size and speeds up inference by replacing 32-bit floating point operations with 8-bit integer operations. Save the quantized model to `/models/lstm_v1_quantized.onnx`.

12. Benchmark inference latency. Measure how long it takes to run 1000 predictions through the original PyTorch model, the ONNX model, and the quantized ONNX model. Record the average milliseconds per prediction for each. This benchmark table will go in your README.

13. Register the ensemble as `collision-risk-v2` in the MLflow model registry and promote it to `Production` stage since it beats v1.

---

### WEEK 5 — FastAPI Deployment + Docker + Monitoring
**Discipline: Software Engineering + MLOps**
**Estimated time: 4–5 hours**

#### What you are doing
You are turning your trained model from a file on disk into a live service that can accept real aircraft data and return collision risk predictions via HTTP. You are also containerizing the whole system and adding production-grade monitoring.

#### Steps

1. Create your FastAPI application inside `/src/api/`. At startup, the app should load the quantized ONNX model from disk into memory. It should stay loaded for the lifetime of the application — never reload it per request.

2. Define a Pydantic request model called `AircraftPairFeatures` that specifies the exact shape of valid input: five float fields for distance, closing speed, bearing difference, vertical separation, and time-to-CPA. Pydantic will automatically reject any request that is missing a field or has the wrong data type, returning a clear error message.

3. Define a Pydantic response model called `CollisionRiskResponse` that returns the risk score as a float between 0 and 1, the risk percentage as an integer between 0 and 100, a risk level as a string (high / medium / low), and a recommended action string.

4. Create a `POST /predict` endpoint that accepts an `AircraftPairFeatures` request, runs it through the ONNX model, and returns a `CollisionRiskResponse`. Risk levels are: high if score above 0.7, medium if score between 0.3 and 0.7, low if score below 0.3.

5. Create a `GET /health` endpoint that returns the model name, model version, and current status. This is used by Docker and monitoring systems to check whether the service is alive.

6. Create a `GET /alerts` endpoint that accepts a bounding box (min/max lat/lon) as query parameters, fetches the current aircraft from OpenSky for that bounding box, computes all aircraft pair features, runs them all through the model, and returns only pairs with a risk score above 0.3, sorted by risk score descending.

7. Add simple API key authentication using a FastAPI dependency. Every request must include a header called `X-API-Key` whose value matches the key stored in your `.env` file. Requests without a valid key receive a 401 Unauthorized response. Store the key in `.env`, never in code.

8. Add structured JSON logging to every request. Each log entry must include: the timestamp, the endpoint called, the input features, the prediction score, the latency in milliseconds, and any errors. Use Python's built-in `logging` module with a JSON formatter. This means every single prediction your model makes is permanently logged and auditable.

9. Add Prometheus metrics using the `prometheus-fastapi-instrumentator` library. This automatically exposes a `/metrics` endpoint that Prometheus can scrape. It tracks request count, request latency histogram, and in-flight request count. Add one custom metric: a histogram of model prediction scores, so you can see how risk scores are distributed across all predictions over time.

10. Write a `Dockerfile` for your FastAPI application. Start from a Python 3.11 slim base image. Copy your requirements and install dependencies first (before copying your source code) so that Docker can cache the dependency layer and rebuild faster. Copy your source code. Expose port 8000. Set the startup command to run uvicorn.

11. Write a `docker-compose.yml` that defines two services: your FastAPI app and an MLflow tracking server. The FastAPI service should mount your `/models` directory so it can access model files without rebuilding the image. The MLflow service should persist its data to a local volume.

12. Set up GitHub Actions by creating a `.github/workflows/ci.yml` file. It should trigger on every push to the main branch. The workflow should: check out the code, install dependencies, run your test suite with pytest, check code style with ruff, and build the Docker image to confirm it compiles successfully. A failing test should block the merge.

13. Run the full stack with `docker-compose up` and test the `/predict`, `/health`, and `/alerts` endpoints manually using curl or a REST client. Confirm that predictions are being logged, metrics are being exposed, and MLflow is accessible.

---

### WEEK 6 — TypeScript + React UI (Live Map + Risk Dashboard)
**Discipline: Frontend / UI + Software Engineering**
**Estimated time: 5–6 hours**

#### What you are doing
You are building the visual layer of Phase 1 — the dashboard that makes your project real and demo-able. This is the week when someone can look at your screen and immediately understand what you built.

#### Steps

1. Create a new Next.js project with TypeScript inside a `/frontend` folder in your repository. Choose the App Router option. Install Tailwind CSS during setup.

2. Install your frontend dependencies: `react-leaflet` and `leaflet` for the map, `axios` for API calls, `recharts` for charts, and `@types/leaflet` for TypeScript types.

3. Create a TypeScript interface file that defines the shape of every data structure your frontend will use: `Aircraft` (callsign, lat, lon, altitude, speed, heading), `AlertPair` (callsign1, callsign2, riskScore, riskPercent, riskLevel, cpaMinutes, separationNm), and `ModelMetrics` (xgboostAuroc, lstmAuroc, ensembleAuroc, inferenceMs).

4. Create an API client module using Axios that contains all the functions for talking to your FastAPI backend: `fetchAlerts(bbox)`, `fetchPrediction(features)`, and `fetchHealth()`. All API calls go through this module — never call Axios directly from a component.

5. Build the top navigation bar component. It shows the project name on the left, a pulsing green dot with the word "Live" to indicate the feed is active, and a timestamp showing when data was last refreshed on the right.

6. Build the four statistics cards at the top of the dashboard. They show: total aircraft currently tracked, number of high risk pairs (shown in red), number of medium risk pairs (shown in orange), and the minimum time to CPA across all active pairs (shown in red if below 5 minutes).

7. Build the live aircraft map component using `react-leaflet`. Use OpenStreetMap tiles as the base layer. For each aircraft in the current feed, render a circle marker whose color is red if risk is above 70%, orange if risk is between 30% and 70%, and green if risk is below 30%. Show the callsign and risk percentage as a label next to each marker. Add a popup that appears on click showing full aircraft details.

8. For high-risk aircraft pairs, draw a dashed line between the two aircraft showing their converging trajectories. Add an animated pulsing ring around each aircraft in a high-risk pair so it is immediately obvious which ones need attention.

9. Write a `useInterval` custom hook that calls `fetchAlerts` from your API client every 30 seconds and updates the map and alert list with fresh data. Show a small spinner while the fetch is in progress.

10. Build the alerts panel to the right of the map. It lists every aircraft pair with a risk score above 30%, sorted from highest to lowest. Each row shows an icon (red triangle for high, orange circle for medium, green info for low), the two callsigns, the CPA time and current separation, and the risk percentage in large bold text colored by severity.

11. Build the risk detail panel below the alerts list. When the user clicks any alert row, this panel updates to show the full breakdown for that pair: a horizontal gauge bar showing the risk percentage, and a table of all telemetry values (altitude, heading, closing speed, vertical separation, time to CPA, CPA distance, and which model produced the score).

12. Build the model performance panel at the bottom right. It fetches metrics from MLflow (or from a static JSON file if you do not want to expose MLflow) and shows bar charts for XGBoost AUROC, LSTM AUROC, ensemble AUROC, and inference latency in milliseconds.

13. Make sure the entire dashboard looks correct on both light and dark mode by testing it in both your system settings.

14. Configure your Next.js app to proxy API calls to your FastAPI backend in development by adding a `rewrites` rule in `next.config.js`. This avoids CORS issues during development.

---

### WEEK 7 — Tests + Drift Detection + README + Demo Video
**Discipline: Software Engineering + MLOps + Portfolio**
**Estimated time: 4–5 hours**

#### What you are doing
You are making Phase 1 portfolio-ready. You are adding tests so your code is provably correct, drift detection so the system can catch when incoming data changes, and a polished README and demo video that make the project understandable in 2 minutes to any recruiter or CEO.

#### Steps

1. Write unit tests for every feature engineering function using pytest. For `haversine_distance`, test it with two known coordinates whose correct distance you can look up. For `compute_bearing_difference`, test that two opposite headings return 180 degrees. For `compute_time_to_cpa`, test a simple converging scenario where you know the answer. Tests go in `/tests/test_features.py`.

2. Write a unit test for your data validation function. Create a DataFrame with intentionally bad records — a row with null latitude, a row with speed of 2000 knots, a row with negative altitude — and assert that your validation function rejects all of them and logs the correct rejection count.

3. Write an integration test for your FastAPI `/predict` endpoint. Start the FastAPI app in test mode using pytest's `TestClient`. Send a POST request with a known aircraft pair's features and assert that the response has the correct schema, that the risk score is between 0 and 1, and that the risk level is one of the three valid strings.

4. Write a model regression test. Load the champion model from the MLflow model registry. Run it on a small fixed test set of 50 examples. Assert that the AUROC is above 0.85. If a future model is ever registered and its AUROC drops below this threshold, this test will fail and block deployment. This is the core of your model quality gate.

5. Set up Evidently AI for data drift detection. Evidently compares the statistical distribution of incoming data against your training data. Create a reference dataset from your training features. Write a script that runs daily (or whenever new ADS-B data arrives) and generates an Evidently drift report comparing new data against the reference. If drift is detected — meaning the distribution of any feature has shifted significantly — the script logs a warning to MLflow and prints a clear message.

6. Draw your system architecture diagram. Use Excalidraw (free, browser-based) or draw.io. The diagram should show every component of Phase 1 and how data flows between them: OpenSky API → data ingestion → feature engineering → ML models → FastAPI → Next.js dashboard. Label every arrow with what kind of data flows along it. Export as a PNG and save to `/docs/architecture_phase1.png`.

7. Write your README.md. It must contain the following sections in order: a one-paragraph description of what the project does and why it matters, a screenshot or GIF of the live dashboard, your architecture diagram, a dataset description (OpenSky + NTSB, what each contains, how many records), a model results table showing XGBoost vs LSTM vs ensemble AUROC and inference latency, setup instructions (how to clone, install dependencies, set up `.env`, run with docker-compose), and a link to your demo video.

8. Record your demo video. Use Loom or OBS. Keep it under 3 minutes. Show in this exact order: open the live dashboard and point out the real aircraft on the map, click one of the high-risk alerts and show the risk percentage and breakdown panel, show the model performance panel with AUROC scores, show the MLflow dashboard with your experiment runs and model registry, open your terminal and show the structured JSON logs coming in as predictions are made. Do not narrate the code. Narrate what the system is doing and why each part matters.

9. Clean up the entire repository. Remove any hardcoded API keys or secrets from all files. Add every secret file to `.gitignore`. Create a `.env.example` file that lists every environment variable the project needs with placeholder values and a comment explaining each one. Pin all dependencies in `requirements.txt` to exact versions. Add a `frontend/package.json` with all frontend dependencies pinned.

10. Push everything to GitHub. Your repository should now have a clean commit history, a professional README that renders well on GitHub, passing CI checks, and a linked demo video. Phase 1 is complete.

---
---

## PHASE 2 — GenAI Layer (RAG + Fine-tuning + AI Agent + Guardrails)

---

### WEEK 8 — RAG Pipeline (NTSB + FAA Documents)
**Discipline: Data Engineering + GenAI**
**Estimated time: 4–5 hours**

#### What you are doing
You are building the knowledge base that your AI agent will search when explaining collision risks. Instead of the LLM relying on its training memory, it will retrieve real NTSB incident reports and FAA regulations at query time and ground every answer in actual documents.

#### Steps

1. Install your RAG dependencies: `llama-index`, `chromadb`, `sentence-transformers`, `pdfplumber`, and `pypdf`.

2. Gather your source documents. You already have the NTSB database CSV from Phase 1. Now additionally download at least 5 FAA Advisory Circular PDFs related to collision avoidance and TCAS procedures from faa.gov. Download ICAO Doc 4444 if available publicly, otherwise use the FAA equivalent (7110.65). Save all documents to `/data/documents/`.

3. Write a document loader for the NTSB CSV. For each row, create a text chunk that combines the accident narrative, aircraft type, phase of flight, weather conditions, and probable cause fields into a single readable paragraph. Each chunk should be self-contained and make sense on its own without needing to read the surrounding rows. Add metadata to each chunk: the NTSB event ID, the date, the aircraft type, and the location.

4. Write a document loader for the FAA PDF files using pdfplumber. Extract the text from each page. Split the text into chunks of approximately 512 tokens with a 50-token overlap between consecutive chunks. The overlap ensures that a sentence split across two chunks is fully captured in at least one of them. Add metadata: the source filename, the page number, and the document title.

5. Set up ChromaDB as your vector store. Create a local persistent ChromaDB instance that saves its data to `/data/vectorstore/`. Create a collection called `aviation-safety-knowledge`.

6. Choose an embedding model. Use `sentence-transformers/all-MiniLM-L6-v2` — it is free, fast, and runs entirely on your CPU. This model converts any text into a 384-dimensional vector that captures its semantic meaning.

7. Embed all your document chunks and insert them into ChromaDB. For each chunk, generate its embedding vector using the sentence transformer and store the vector alongside the original text and metadata in ChromaDB. This process may take 20–40 minutes for 90,000 NTSB records — run it once and save the result. Never re-embed documents you have already embedded.

8. Write a retrieval function called `search_knowledge_base(query, top_k=5)` that takes a plain English query, embeds it using the same sentence transformer, searches ChromaDB for the top-k most semantically similar chunks, and returns them along with their source metadata. Test this function manually by querying "converging aircraft mid-air collision at cruise altitude" and verifying that relevant NTSB reports appear in the results.

9. Evaluate your retrieval quality manually. Write 10 test queries based on real aviation scenarios. For each query, look at the top 5 returned chunks and assess whether they are genuinely relevant. If irrelevant chunks are consistently appearing, try adjusting your chunk size or experimenting with a different embedding model.

10. Build a LlamaIndex wrapper around your ChromaDB retrieval function so it integrates cleanly with LangChain and LangGraph in the coming weeks. LlamaIndex handles the chunking, embedding, and retrieval pipeline in a unified API that simplifies the integration.

11. Log the number of documents indexed, the embedding model used, and the average retrieval latency to MLflow as a new experiment called `rag-pipeline-v1`.

---

### WEEK 9 — LLM Fine-tuning (Mistral 7B + LoRA)
**Discipline: Deep Learning + GenAI**
**Estimated time: 5–6 hours**

#### What you are doing
You are teaching a general-purpose language model to speak aviation fluently. A base model does not understand METAR strings, TCAS resolution advisories, or ICAO phraseology. After fine-tuning, your model will interpret them correctly and produce accurate, domain-appropriate explanations.

#### Steps

1. Install your fine-tuning dependencies: `transformers`, `peft`, `trl`, `bitsandbytes`, `accelerate`, `datasets`, and `wandb`. You will run fine-tuning on Google Colab Pro — make a copy of your code in a Colab notebook.

2. Create your fine-tuning dataset. You need at least 500 instruction-response pairs in aviation safety. Construct them from three sources: First, take 200 NTSB accident narratives and write a question-answer pair for each — for example, the question is "What caused this near-miss between two aircraft at FL350?" and the answer is a clean summary of the NTSB finding. Second, write 150 pairs covering METAR and TAF interpretation — the question provides a raw encoded weather string and the answer explains what it means for flight safety. Third, write 150 pairs covering TCAS resolution advisories — the question describes a RA scenario and the answer explains the correct pilot response.

3. Format every training example in the Alpaca instruction format. Each example has three fields: an instruction (the question or task), an input (optional context), and an output (the ideal response). This is the format the model expects during fine-tuning.

4. Upload your dataset to HuggingFace Datasets format and save it to `/data/finetune/aviation_qa_dataset.json`.

5. Open Google Colab Pro and create a new notebook. Select an A100 GPU runtime. Mount your Google Drive to save checkpoints.

6. Load the Mistral 7B base model in 4-bit quantization using `bitsandbytes`. This reduces the model from 14GB to approximately 4GB so it fits in GPU memory. You are not training the full model — you are training small adapter layers on top of it using LoRA.

7. Configure LoRA using the PEFT library. Set the LoRA rank to 16, the alpha to 32, and target the attention layers (q_proj and v_proj). These settings mean you are training approximately 4 million parameters instead of 7 billion — making fine-tuning fast and affordable.

8. Set up Weights & Biases logging for your training run. This gives you live charts of training loss, validation loss, and gradient norms. Create a free W&B account and log in inside your Colab notebook.

9. Fine-tune using the `SFTTrainer` from the TRL library. Train for 3 epochs with a batch size of 4. Use gradient accumulation of 4 steps to simulate a larger effective batch size. Save a checkpoint after every epoch to Google Drive.

10. After training finishes, evaluate the fine-tuned model against the base Mistral 7B on 20 held-out aviation questions. For each question, generate the base model's answer and the fine-tuned model's answer. Compare them side by side. The fine-tuned model should decode METAR strings correctly, use proper ICAO terminology, and give more accurate TCAS guidance.

11. Merge the LoRA adapters back into the base model weights to create a standalone fine-tuned model. Save it to `/models/mistral-7b-aviation-finetuned/`.

12. Set up Ollama on your local machine and import your fine-tuned model into it. Ollama lets you run the model locally with a simple API, avoiding any ongoing inference costs during development.

13. Test the fine-tuned model by asking it to explain a METAR string, describe the correct response to a TCAS RA, and summarize an NTSB finding. Confirm that the answers are meaningfully better than the base model.

---

### WEEK 10 — AI Agent with LangGraph
**Discipline: GenAI + Software Engineering**
**Estimated time: 5–6 hours**

#### What you are doing
You are building the brain that connects everything. The agent receives a collision risk alert from your Phase 1 ML pipeline and decides — autonomously — which tools to call, in what order, to produce a rich, evidence-based explanation for a human operator.

#### Steps

1. Install your agent dependencies: `langchain`, `langgraph`, `langchain-community`, and `langchain-ollama`.

2. Define five tools that the agent can call. Each tool is a Python function decorated with LangChain's `@tool` decorator:
   - `fetch_live_adsb(callsign)` — calls the OpenSky API and returns the current position, speed, altitude, and heading for a given callsign
   - `predict_collision_risk(features)` — calls your FastAPI `/predict` endpoint and returns the risk score
   - `search_ntsb_incidents(scenario_description)` — calls your RAG retrieval function with a text description of the current scenario and returns the top 5 relevant NTSB incident summaries with source citations
   - `lookup_regulation(topic)` — queries your RAG vector store but filtered to FAA/ICAO documents only, returning the relevant regulatory text
   - `fetch_weather(airport_code)` — calls the AviationWeather.gov API and returns the current METAR for the nearest airport

3. Define your agent's state using LangGraph's `TypedDict`. The state should track: the original user query, the list of tool calls made so far, the observations returned by each tool, the current reasoning step, and the final answer.

4. Build your LangGraph state graph. Create the following nodes:
   - A `reasoning` node where the fine-tuned LLM reads the current state and decides which tool to call next (or decides it has enough information to answer)
   - One node for each tool call
   - An `answer` node where the LLM synthesizes all observations into a final response

5. Add conditional edges between nodes. After the `reasoning` node, the graph routes to whichever tool the LLM chose. After each tool node, the graph always routes back to `reasoning`. The `reasoning` node routes to `answer` when the LLM decides it has gathered enough information. This loop is the ReAct (Reason + Act) pattern.

6. Set a maximum of 10 reasoning steps to prevent infinite loops. If the agent has not produced a final answer after 10 steps, it should output whatever partial answer it has constructed along with a note that it reached the step limit.

7. Test the agent with a simple query: "Why is AAL302 flagged as high risk?" The agent should: call `fetch_live_adsb` for AAL302, call `fetch_live_adsb` for UAL189, call `predict_collision_risk` with the pair's features, call `search_ntsb_incidents` with a description of the converging geometry, call `lookup_regulation` for ICAO separation minima, and finally produce a synthesized answer that references all of these.

8. Implement multi-aircraft monitoring. Write a background loop that runs every 60 seconds, fetches all high-risk pairs from your FastAPI `/alerts` endpoint, and for each pair above 70% risk, automatically triggers the agent to generate a risk briefing. Store these briefings in a simple SQLite database with the pair callsigns, the timestamp, the risk score, and the full briefing text.

9. Implement autonomous escalation. If a pair's risk score exceeds 85% AND time-to-CPA is below 4 minutes, the agent should mark the briefing as `CRITICAL` and log it with a higher severity level in your structured logs. In a real system this would page an operator — for the portfolio, logging it visibly is sufficient.

10. Test the full end-to-end flow with a live scenario. Pull real aircraft from OpenSky, find a pair that your model scores above 30%, trigger the agent, and read the generated briefing. Verify that every factual claim in the briefing is traceable to a tool call result — not invented by the model.

---

### WEEK 11 — Guardrails
**Discipline: GenAI + Software Engineering**
**Estimated time: 4–5 hours**

#### What you are doing
You are adding the safety layer that makes this system trustworthy. Aviation is a safety-critical domain. The agent must never suppress a genuine alert, never invent a fact it cannot cite, and never give a definitive prediction it is not qualified to make. Guardrails enforce all of this automatically.

#### Steps

1. Install NeMo Guardrails: `nemoguardrails`. Read the quickstart documentation carefully — NeMo uses its own configuration language called Colang which takes about an hour to get comfortable with.

2. Create a guardrails configuration folder at `/src/guardrails/`. Inside it, create a `config.yml` that points to your Colang files and specifies which LLM to use (point it to your local Ollama instance).

3. Write your first Colang file: `input_rails.co`. This defines what the agent is allowed to receive. Write a rule that rejects any query that is completely unrelated to aviation safety. Write a rule that rejects queries that contain garbled or clearly invalid callsigns. Write a rule that rejects queries trying to ask the system to ignore its safety guidelines.

4. Write your second Colang file: `output_rails.co`. This defines what the agent is allowed to output. Write a rule that blocks any response that uses absolute language about whether a collision will or will not occur — phrases like "they will definitely collide" or "there is no danger" must be caught and replaced with appropriately hedged language. Write a rule that ensures every high-risk briefing includes a statement recommending that a qualified air traffic controller make the final operational decision.

5. Write your third Colang file: `fact_checking.co`. This implements hallucination prevention. Write a rule that checks whether each factual claim in the agent's response (a specific NTSB case number, a specific regulation, a specific risk percentage) was actually returned by one of the tool calls in the current session. If a claim appears in the response that was not in any tool result, flag it and remove it.

6. Write your fourth Colang file: `confidence_rails.co`. This implements low-confidence escalation. After the agent produces a response, check the retrieval similarity scores from the RAG calls in that session. If the top retrieved document had a similarity score below 0.5, it means the vector store did not find a good match for the query. In this case, the agent should respond with "I don't have reliable historical precedent for this specific scenario" rather than attempting to answer from general knowledge.

7. Integrate NeMo Guardrails with your LangGraph agent. Wrap the agent's input processing and output generation with the guardrail checks. The guardrails run before the agent processes any input and after the agent generates any output.

8. Set up Llama Guard as an additional output filter. Llama Guard is an open-source safety classifier from Meta that scores whether a piece of text is harmful. Run every agent response through Llama Guard before it reaches the user. If Llama Guard flags a response as potentially harmful, suppress it and replace it with a safe fallback message.

9. Build a guardrail event logger. Every time a guardrail fires — whether blocking an input, modifying an output, or triggering escalation — log the event to a file with the timestamp, which rail fired, what was blocked, and what was returned instead. This creates an audit trail.

10. Write tests for your guardrails. Test that the definitive prediction blocker fires when you ask "will these planes crash?". Test that the off-topic filter fires when you ask about something completely unrelated. Test that the citation check catches a fabricated NTSB case number. All guardrail tests go in `/tests/test_guardrails.py`.

---

### WEEK 12 — Connect Phase 1 + Phase 2 + Upgrade UI
**Discipline: Software Engineering + GenAI + Frontend**
**Estimated time: 5–6 hours**

#### What you are doing
You are wiring Phase 1 and Phase 2 together into a single unified system. The ML pipeline detects risk. The agent explains it. The guardrails validate it. Now you update the UI to show all of this together so the full system is visible in one dashboard.

#### Steps

1. Update your FastAPI backend to expose two new endpoints. A `POST /agent/explain` endpoint that accepts two callsigns, triggers the LangGraph agent for that pair, and streams the agent's reasoning steps and final answer back to the client as a Server-Sent Events stream. A `GET /guardrails/events` endpoint that returns the last 50 guardrail firing events from the log file.

2. Add streaming support to your FastAPI endpoint using Python's `StreamingResponse`. As the agent calls each tool, emit a Server-Sent Event with the tool name and a brief description of what it found. When the agent produces its final answer, emit a final event with the complete briefing text. This creates the visible reasoning chain effect in the UI.

3. Add a new tab to your Next.js dashboard called "Agent chat". This tab contains a chat interface where the user can type a question about any aircraft pair. When submitted, the frontend connects to the `/agent/explain` SSE stream and displays each reasoning step as it arrives — "Fetching live ADS-B for AAL302… Searching NTSB for converging scenarios… Checking ICAO separation minima…" — followed by the final cited answer.

4. Style the reasoning steps as a visible chain. Each step should appear as a small row with a spinning indicator while in progress and a green checkmark when complete. The final answer appears below the completed steps in a separate styled block.

5. Add source citation chips below every agent answer. For each tool call result that was used in the answer, render a small pill showing the source — for example "NTSB #DCA01MA065" or "ICAO Doc 4444 §5.4.1". These chips are the proof that the answer is grounded.

6. Add a "Guardrails" tab to your dashboard. It shows two sections: a list of the five active guardrail rules with a green "active" badge next to each one, and a live feed of the last 20 guardrail firing events showing which rail fired, what was blocked, and when.

7. Update the risk detail panel in your existing dashboard to include an "Explain with AI" button. Clicking this button navigates to the agent chat tab and pre-fills the query "Explain the collision risk between [callsign1] and [callsign2]", triggering the agent automatically.

8. Test the complete system end-to-end. Open the dashboard, find a high-risk alert from the live map, click "Explain with AI", watch the agent reason in real time across all five tools, read the final cited briefing, and verify that asking it to make a definitive prediction triggers the guardrail visibly in the UI.

---

### WEEK 13 — Phase 2 Polish + Final README + Demo Video
**Discipline: Software Engineering + Portfolio**
**Estimated time: 4–5 hours**

#### What you are doing
You are making Phase 2 portfolio-ready. This is the week that multiplies the value of everything you built. A strong final README and demo video are what get your GitHub link forwarded to a hiring manager.

#### Steps

1. Write unit tests for the agent tools. Mock the OpenSky API, FastAPI endpoint, and RAG retrieval function. Test that each tool returns the expected output format and handles API errors gracefully (e.g., if OpenSky is down, the tool should return a clear error message rather than crashing the agent).

2. Add error handling and retry logic throughout Phase 2. The LangGraph agent should catch tool call failures and either retry once or skip that tool and continue with the information it has. The RAG retrieval should catch ChromaDB connection errors. The fine-tuned model inference should fall back to a base model if the fine-tuned model is unavailable.

3. Draw your updated system architecture diagram covering both phases. It should show all components: OpenSky API, data pipeline, ML models (XGBoost + LSTM), MLflow registry, FastAPI, ChromaDB, fine-tuned LLM (via Ollama), LangGraph agent, NeMo Guardrails, and the Next.js frontend. Use arrows to show data flow. Export as `/docs/architecture_full.png`.

4. Update your README.md. Add a new Phase 2 section below the Phase 1 section. Include: a description of the GenAI layer and why each component was added, a diagram of the agent reasoning loop, a screenshot of the agent chat tab showing a live reasoning chain, a screenshot of the guardrails tab showing a fired event, and a brief explanation of what each guardrail does and why it matters in a safety-critical context.

5. Add a model evaluation section to the README that covers both phases. For Phase 1: the XGBoost, LSTM, and ensemble AUROC scores and inference latency. For Phase 2: the RAG retrieval precision on your 10 test queries, a qualitative comparison of base model vs fine-tuned model on 5 example questions, and a log of guardrail firing rates during testing.

6. Record your final demo video. Keep it under 4 minutes. Show in this exact order: the live map with real aircraft and risk scores (20 seconds), click a high-risk alert and show the risk breakdown (20 seconds), click "Explain with AI" and let the agent reasoning chain play out in real time — this is the most important moment in the video (60 seconds), show the guardrail firing by asking "will these planes crash?" and let the viewer see the rail block the response (20 seconds), briefly show the MLflow dashboard with experiment runs and the W&B fine-tuning loss curves (30 seconds), briefly show the guardrails audit log (15 seconds). End with a single slide showing the tech stack.

7. Review every file in the repository one final time. Make sure there are no hardcoded secrets anywhere. Make sure every environment variable is documented in `.env.example`. Make sure `requirements.txt` and `package.json` are both complete and pinned to exact versions. Make sure the Docker setup works from a clean clone by testing it on a second machine or in a fresh Docker environment.

8. Push the final version to GitHub. Confirm that all GitHub Actions CI checks pass on the main branch. Confirm that the README renders correctly with all images displaying. Add a topic tag to your GitHub repository: `machine-learning`, `deep-learning`, `llm`, `rag`, `langchain`, `aviation`, `fastapi`, `nextjs`.

9. Phase 2 is complete. You now have a production-style, end-to-end AI system that covers ML, DL, RAG, fine-tuning, agentic AI, and guardrails — all applied to a real-world safety-critical aviation problem, with real datasets, a live UI, and a deployed API. Start applying.

---

## Quick Reference

| Week | Phase | Main deliverable | Discipline |
|------|-------|-----------------|------------|
| 1 | 1 | Data pipeline + MLflow | Data Engineering |
| 2 | 1 | Feature matrix + balanced dataset | Data Engineering + ML |
| 3 | 1 | XGBoost model + evaluation harness | ML + MLOps |
| 4 | 1 | LSTM + ensemble + ONNX | Deep Learning + MLOps |
| 5 | 1 | FastAPI + Docker + monitoring | SWE + MLOps |
| 6 | 1 | Live TypeScript dashboard | Frontend + SWE |
| 7 | 1 | Tests + drift detection + README + demo | SWE + MLOps + Portfolio |
| 8 | 2 | RAG pipeline over NTSB + FAA docs | Data Engineering + GenAI |
| 9 | 2 | Fine-tuned Mistral 7B with LoRA | Deep Learning + GenAI |
| 10 | 2 | LangGraph AI agent with 5 tools | GenAI + SWE |
| 11 | 2 | NeMo Guardrails + Llama Guard | GenAI + SWE |
| 12 | 2 | Full system integration + UI upgrade | SWE + GenAI + Frontend |
| 13 | 2 | Polish + full README + demo video | Portfolio |