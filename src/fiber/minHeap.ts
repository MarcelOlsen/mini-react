/* **************** */
/* Scheduler Min-Heap                             */
/* **************** */

/**
 * A tiny binary min-heap keyed by `sortIndex`.
 * Used by the scheduler instead of `Array.sort()` so that
 * enqueue / dequeue are both O(log n).
 */

export type HeapNode = {
	id: number;
	sortIndex: number;
};

/**
 * Peek at the minimum node without removing it.
 */
export function peek<T extends HeapNode>(heap: T[]): T | undefined {
	return heap[0];
}

/**
 * Insert a node into the heap.
 */
export function push<T extends HeapNode>(heap: T[], node: T): void {
	const index = heap.length;
	heap.push(node);
	siftUp(heap, index);
}

/**
 * Remove and return the minimum node.
 */
export function pop<T extends HeapNode>(heap: T[]): T | undefined {
	if (heap.length === 0) return undefined;
	const first = heap[0];
	if (heap.length === 1) {
		heap.pop();
		return first;
	}
	const last = heap.pop();
	if (last === undefined) return undefined;
	heap[0] = last;
	siftDown(heap, 0);
	return first;
}

/* ============================================ */
/* Internal heap operations                        */
/* ============================================ */

function siftUp<T extends HeapNode>(heap: T[], startIdx: number): void {
	let idx = startIdx;
	while (idx > 0) {
		const parent = (idx - 1) >>> 1;
		const parentNode = heap[parent];
		const idxNode = heap[idx];
		if (parentNode === undefined || idxNode === undefined) return;
		if (parentNode.sortIndex <= idxNode.sortIndex) return;
		swap(heap, parent, idx);
		idx = parent;
	}
}

function siftDown<T extends HeapNode>(heap: T[], startIdx: number): void {
	const len = heap.length;
	const half = len >>> 1;
	let idx = startIdx;
	while (idx < half) {
		let smallest = idx;
		const left = idx * 2 + 1;
		const right = left + 1;

		const leftNode = heap[left];
		const smallestNode = heap[smallest];
		if (
			left < len &&
			leftNode !== undefined &&
			smallestNode !== undefined &&
			leftNode.sortIndex < smallestNode.sortIndex
		) {
			smallest = left;
		}

		const rightNode = heap[right];
		const newSmallestNode = heap[smallest];
		if (
			right < len &&
			rightNode !== undefined &&
			newSmallestNode !== undefined &&
			rightNode.sortIndex < newSmallestNode.sortIndex
		) {
			smallest = right;
		}
		if (smallest === idx) return;
		swap(heap, smallest, idx);
		idx = smallest;
	}
}

function swap<T extends HeapNode>(heap: T[], a: number, b: number): void {
	const tmp = heap[a];
	const nodeB = heap[b];
	if (tmp === undefined || nodeB === undefined) return;
	heap[a] = nodeB;
	heap[b] = tmp;
}
