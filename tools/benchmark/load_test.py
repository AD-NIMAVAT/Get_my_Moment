import os
import sys
import time
import statistics
import concurrent.futures
from typing import List, Dict
import numpy as np

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, BASE_DIR)

from apps.api.services.ai_service import ai_service


def generate_benchmark_vectors(count: int, dimensions: int = 128) -> np.ndarray:
    """Generate normalized synthetic facial vectors for benchmarking."""
    np.random.seed(42)
    raw = np.random.randn(count, dimensions).astype(np.float32)
    norms = np.linalg.norm(raw, axis=1, keepdims=True)
    return raw / norms


def execute_vector_search(query_vector: np.ndarray, index_matrix: np.ndarray, top_k: int = 10) -> float:
    """Simulate single vector cosine similarity query against index and return latency in ms."""
    t0 = time.perf_counter()
    # Dot product against all vectors in the event
    scores = np.dot(index_matrix, query_vector)
    # Get top-k indices
    top_indices = np.argpartition(scores, -top_k)[-top_k:]
    sorted_top = top_indices[np.argsort(-scores[top_indices])]
    t1 = time.perf_counter()
    return (t1 - t0) * 1000.0


def run_concurrency_benchmark(event_photo_count: int, concurrency_levels: List[int], queries_per_level: int = 100):
    """Run concurrent load test across multiple worker threads."""
    print(f"\n=======================================================")
    print(f"  P27 Scaled Load Benchmark — Event Size: {event_photo_count:,} Photos")
    print(f"=======================================================")

    index = generate_benchmark_vectors(event_photo_count)
    queries = generate_benchmark_vectors(queries_per_level)

    for concurrency in concurrency_levels:
        latencies: List[float] = []
        start_wall = time.perf_counter()

        def worker_task(query_idx: int) -> float:
            q = queries[query_idx % len(queries)]
            return execute_vector_search(q, index)

        with concurrent.futures.ThreadPoolExecutor(max_workers=concurrency) as executor:
            futures = [executor.submit(worker_task, i) for i in range(queries_per_level)]
            for future in concurrent.futures.as_completed(futures):
                latencies.append(future.result())

        total_wall_sec = time.perf_counter() - start_wall
        qps = len(latencies) / total_wall_sec

        p50 = statistics.median(latencies)
        p95 = np.percentile(latencies, 95)
        p99 = np.percentile(latencies, 99)
        mean_lat = statistics.mean(latencies)

        print(f"\n[ Concurrency: {concurrency:2d} Workers | Total Requests: {queries_per_level} ]")
        print(f"  Throughput (QPS)   : {qps:10.1f} req/sec")
        print(f"  Mean Latency       : {mean_lat:10.3f} ms")
        print(f"  P50 Median Latency : {p50:10.3f} ms")
        print(f"  P95 Latency        : {p95:10.3f} ms")
        print(f"  P99 Latency        : {p99:10.3f} ms")
        print(f"  Total Duration     : {total_wall_sec:10.3f} s")


if __name__ == "__main__":
    print("Initializing Get My Moment Scaled Load Testing Suite...")
    # Benchmark standard wedding scale (1,000 photos)
    run_concurrency_benchmark(event_photo_count=1_000, concurrency_levels=[1, 10, 25, 50], queries_per_level=500)
    # Benchmark mega corporate/festival scale (10,000 photos)
    run_concurrency_benchmark(event_photo_count=10_000, concurrency_levels=[1, 10, 25, 50], queries_per_level=500)
    print("\n[OK] Scaled load benchmark completed successfully.")
