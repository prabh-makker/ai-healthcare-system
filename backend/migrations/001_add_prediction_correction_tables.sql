-- Migration: Add Prediction and Correction tables for continuous learning
-- Description: Creates tables for storing ML model predictions and analyst corrections
-- This enables the continuous learning pipeline for model retraining

-- Prediction table: stores ML model predictions for network traffic
CREATE TABLE IF NOT EXISTS prediction (
    id VARCHAR(36) PRIMARY KEY,
    -- Network packet data
    src_ip VARCHAR(15) NOT NULL,
    dst_ip VARCHAR(15) NOT NULL,
    protocol_type VARCHAR(10) NOT NULL,
    service VARCHAR(20) NOT NULL,
    src_bytes FLOAT NOT NULL,
    srv_count FLOAT NOT NULL,
    serror_rate FLOAT NOT NULL,
    flag VARCHAR(10) NOT NULL,
    -- Model prediction
    predicted_label VARCHAR(50) NOT NULL,
    confidence FLOAT NOT NULL,
    -- Status tracking
    is_reviewed BOOLEAN DEFAULT FALSE,
    is_correct BOOLEAN,
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_prediction_src_ip ON prediction(src_ip);
CREATE INDEX IF NOT EXISTS idx_prediction_dst_ip ON prediction(dst_ip);
CREATE INDEX IF NOT EXISTS idx_prediction_label ON prediction(predicted_label);
CREATE INDEX IF NOT EXISTS idx_prediction_reviewed ON prediction(is_reviewed);
CREATE INDEX IF NOT EXISTS idx_prediction_created ON prediction(created_at);

-- Correction table: stores analyst corrections to predictions
CREATE TABLE IF NOT EXISTS correction (
    id VARCHAR(36) PRIMARY KEY,
    prediction_id VARCHAR(36) NOT NULL,
    -- Correction details
    analyst_id VARCHAR(36) NOT NULL,
    actual_label VARCHAR(50) NOT NULL,
    was_correct BOOLEAN NOT NULL,
    notes TEXT,
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- Retraining state
    used_in_retrain BOOLEAN DEFAULT FALSE,
    retrain_batch_id VARCHAR(36),
    FOREIGN KEY (prediction_id) REFERENCES prediction(id),
    FOREIGN KEY (analyst_id) REFERENCES "user"(id)
);

CREATE INDEX IF NOT EXISTS idx_correction_prediction ON correction(prediction_id);
CREATE INDEX IF NOT EXISTS idx_correction_analyst ON correction(analyst_id);
CREATE INDEX IF NOT EXISTS idx_correction_used ON correction(used_in_retrain);
CREATE INDEX IF NOT EXISTS idx_correction_created ON correction(created_at);

-- Log: Migration completed successfully
-- Tables created for continuous learning pipeline
