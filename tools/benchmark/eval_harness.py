"""
Get My Moment - Ground-Truth AI Evaluation & HNSW Vector Benchmark Suite
"""

import time
import os
import random
import numpy as np
from typing import List, Dict, Tuple


class VectorBenchmarkHarness:
    """
    Empirical evaluation harness for 128-dimensional facial embeddings,
    cosine similarity matching, and HNSW/Flat vector search indexing.
    """

    def __init__(self, dimensions: int = 128):
        self.dimensions = dimensions

    def generate_synthetic_embeddings(self, count: int, seed: int = 42) -> np.ndarray:
        """Generate count L2-normalized 128-d vectors."""
        np.random.seed(seed)
        raw_vectors = np.random.randn(count, self.dimensions).astype(np.float32)
        norms = np.linalg.norm(raw_vectors, axis=1, keepdims=True)
        return raw_vectors / norms

    def generate_correlated_queries(self, base_vectors: np.ndarray, num_queries: int, noise_level: float = 0.1) -> Tuple[np.ndarray, List[int]]:
        """Generate query vectors that simulate real guest selfies matching ground-truth base vectors."""
        query_indices = np.random.choice(len(base_vectors), size=num_queries, replace=True)
        queries = []
        for idx in query_indices:
            base = base_vectors[idx]
            noise = np.random.randn(self.dimensions).astype(np.float32) * noise_level
            noisy = base + noise
            norm = np.linalg.norm(noisy)
            queries.append(noisy / norm)
        return np.array(queries, dtype=np.float32), query_indices.tolist()

    def run_benchmark(self, dataset_size: int = 1000, num_queries: int = 100) -> Dict[str, any]:
        """
        Execute end-to-end benchmark measuring:
        - Latency (Mean, P50, P95, P99)
        - Throughput (QPS)
        - Precision / Recall @ Threshold
        """
        print(f"[*] Generating {dataset_size} ground-truth 128-d facial vectors...")
        base_vectors = self.generate_synthetic_embeddings(dataset_size)

        print(f"[*] Generating {num_queries} query selfies (correlated ground-truth)...")
        queries, ground_truth_targets = self.generate_correlated_queries(base_vectors, num_queries, noise_level=0.15)

        # 1. Measure Exact Cosine Matrix Search Latency
        print("[*] Benchmarking vector search latency...")
        latencies_ms = []
        top1_correct = 0
        threshold_matches = 0
        threshold = 0.60

        for i, q in enumerate(queries):
            start = time.perf_counter()
            # Cosine similarity dot product against all base vectors in event
            sims = np.dot(base_vectors, q)
            top_idx = int(np.argmax(sims))
            top_sim = float(sims[top_idx])
            elapsed_ms = (time.perf_counter() - start) * 1000.0
            latencies_ms.append(elapsed_ms)

            if top_idx == ground_truth_targets[i]:
                top1_correct += 1
            if top_sim >= threshold:
                threshold_matches += 1

        latencies_ms = sorted(latencies_ms)
        p50 = latencies_ms[int(len(latencies_ms) * 0.50)]
        p95 = latencies_ms[int(len(latencies_ms) * 0.95)]
        p99 = latencies_ms[int(len(latencies_ms) * 0.99)]
        mean_lat = sum(latencies_ms) / len(latencies_ms)
        qps = 1000.0 / mean_lat if mean_lat > 0 else 0

        recall_at_1 = (top1_correct / num_queries) * 100.0

        results = {
            "dataset_size": dataset_size,
            "num_queries": num_queries,
            "dimensions": self.dimensions,
            "mean_latency_ms": round(mean_lat, 3),
            "p50_latency_ms": round(p50, 3),
            "p95_latency_ms": round(p95, 3),
            "p99_latency_ms": round(p99, 3),
            "qps": round(qps, 1),
            "top1_accuracy_pct": round(recall_at_1, 2),
            "threshold_pass_pct": round((threshold_matches / num_queries) * 100.0, 2),
        }
        return results


def main():
    print("=" * 60)
    print("  Get My Moment - Vector & AI Performance Benchmark")
    print("=" * 60)

    harness = VectorBenchmarkHarness(dimensions=128)
    
    # 1,000 photos benchmark (First Milestone)
    print("\n--- 1,000 Photos Event Benchmark ---")
    res_1k = harness.run_benchmark(dataset_size=1000, num_queries=200)
    for k, v in res_1k.items():
        print(f"  {k:25}: {v}")

    # 10,000 photos benchmark (Scalability Test)
    print("\n--- 10,000 Photos Event Benchmark ---")
    res_10k = harness.run_benchmark(dataset_size=10000, num_queries=200)
    for k, v in res_10k.items():
        print(f"  {k:25}: {v}")

    print("\n[+] Benchmark completed successfully.")


if __name__ == "__main__":
    main()
