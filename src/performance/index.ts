/* ***************** */
/* Performance API   */
/* ***************** */

import type { PerformanceMetrics } from "./types";

let isProfilingEnabled = false;
let renderCount = 0;
let totalRenderTime = 0;
let renderStartTime = 0;

/**
 * Starts performance profiling
 */
export function startProfiling(): void {
	isProfilingEnabled = true;
	renderCount = 0;
	totalRenderTime = 0;
	renderStartTime = 0;
}

/**
 * Stops performance profiling and returns metrics
 */
export function stopProfiling(): PerformanceMetrics {
	isProfilingEnabled = false;
	return getPerformanceMetrics();
}

/**
 * Gets current performance metrics
 */
export function getPerformanceMetrics(): PerformanceMetrics {
	return {
		renderCount,
		totalRenderTime,
		averageRenderTime: renderCount > 0 ? totalRenderTime / renderCount : 0,
	};
}

/**
 * Internal function to track render start
 */
export function trackRenderStart(): void {
	if (isProfilingEnabled) {
		renderStartTime = performance.now();
	}
}

/**
 * Internal function to track render end
 */
export function trackRenderEnd(): void {
	if (isProfilingEnabled && renderStartTime > 0) {
		const renderTime = performance.now() - renderStartTime;
		renderCount++;
		totalRenderTime += renderTime;
		renderStartTime = 0;
	}
}
