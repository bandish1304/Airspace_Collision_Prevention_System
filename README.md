Every day, thousands of commercial aircraft move through shared airspace, guided by air traffic control and strict separation rules. If that separation breaks down, two aircraft can converge at very high speed, and the outcome can be severe.

**Phase 1** focuses on building the machine learning and deep learning collision detection engine. It monitors live airspace and predicts collision risk before a situation becomes critical.

The system uses real telemetry from the OpenSky Network, including position, speed, altitude, and heading from active flights. From this data, it computes aviation and physics features such as time to closest point of approach, closing speed, and vertical separation for each aircraft pair.

An XGBoost classifier and an LSTM model are trained on historical NTSB accident data and ADS B trajectories. Their outputs are combined in an ensemble and optimized with ONNX quantization for fast inference. Predictions are served through FastAPI, deployed with Docker, monitored with Prometheus, and tracked with MLflow. A TypeScript dashboard shows real aircraft on an interactive map and refreshes every 30 seconds with current flight data and risk percentages.

At its core, **Phase 1** gives ATC, pilots, analysts, and researchers a clear real time view of potentially dangerous aircraft interactions, with transparent risk scoring and telemetry context.

**Phase 2** adds a GenAI reasoning and explanation layer. A high risk score alone is not enough for operational decision making. People also need to understand why a situation is dangerous, what similar events happened in the past, which regulations apply, and what action should be considered.

To solve this, **Phase 2** builds an intelligence layer over the detection engine. A Mistral 7B model is fine tuned on aviation specific data, including decoded METAR reports, TCAS advisory scenarios, and NTSB narratives. A RAG pipeline indexes more than 90,000 NTSB incident records and FAA regulatory documents in ChromaDB so responses are grounded in retrieved evidence.

A LangGraph agent orchestrates the flow. When a high risk pair appears, it gathers telemetry, runs prediction, retrieves related incidents, checks separation guidance, and produces a cited briefing in plain language. NeMo Guardrails and Llama Guard are used to keep responses safe, avoid unsupported claims, and preserve alert integrity.

The final result is a system that not only detects risk but also explains it with evidence, history, and regulatory context in real time.
