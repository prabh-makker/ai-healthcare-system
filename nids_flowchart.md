# 🛡️ NIDS Sentinel System Flowchart

This document presents the overall system architecture and data flow pipeline for the AI-powered **Network Intrusion Detection System (NIDS) Sentinel**.

## 📊 System Flowchart Diagram

![NIDS Sentinel System Flowchart](C:\Users\khalo\.gemini\antigravity\brain\7b3fc1cf-ca67-4030-8249-4809d40cab43\artifacts\nids_flowchart_diagram.png)

---

## 🔄 Detailed Data Pipeline Stages

The NIDS Sentinel pipeline functions in five main stages:

### 1. Data Capture Layer
*   **Live Traffic:** A background Python service utilizing the `Scapy` library captures raw network packets on the host network interfaces.
*   **PCAP Uploads:** Analysts can upload packet capture (PCAP) files via the dashboard to analyze historical traffic.
*   **System Logs:** Logs and connection details are tracked for comprehensive visibility.

### 2. Feature Extraction & Preprocessing
*   **Feature Engineering:** The packet processor parses raw packets into 22 features (e.g., protocol, flags, service type, byte counts, duration).
*   **Standardization:** The features are scaled using a pre-trained `StandardScaler` (computed from KDD-Cup 99 datasets) to ensure inputs have a mean of 0 and standard deviation of 1, aligning them with the machine learning model's requirements.

### 3. ML Inference Engine (Hybrid Model)
*   **Signature Matcher:** Incoming connections are first scanned against known signature rules for instantaneous detection.
*   **Anomaly Detection (XGBoost/Random Forest):** Connections that pass signature checks are classified by the ML models.
*   **Threat Classification:** The traffic is labeled as *Normal* or categorized into threat types:
    *   **DoS/DDoS** (Denial of Service)
    *   **Probe** (Port scans/reconnaissance)
    *   **R2L** (Unauthorized access from remote machines)
    *   **U2R** (Privilege escalation)
*   **Confidence Scoring:** The system calculates a confidence value from `0.0` to `1.0`. Scores above `0.5` generate active alerts, while lower confidence threats are stored as logs.

### 4. Persistence & Backend API
*   **Database Storage:** High-severity alerts and metrics are persisted into an SQLite database (`nids.db`).
*   **FastAPI Backend:** The REST API exposes secure endpoints for frontend consumption:
    *   `GET /api/v1/alerts/recent` — Fetch recent logs.
    *   `GET /api/v1/alerts/stats` — Fetch analytics and aggregations.
    *   `GET /api/v1/alerts/geoip/{ip}` — Fetch geographical intelligence for attacker IPs.

### 5. Live React/Next.js Dashboard
*   **Alerts Log:** An interactive table showing real-time threats.
*   **GeoIP Map:** Live location mapping of attacking source IPs.
*   **Real-time Analytics:** Visualizations of threat distributions, attack types, and confidence levels over time.
