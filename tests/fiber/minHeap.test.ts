import { describe, expect, test } from "bun:test";
import { peek, pop, push } from "@/fiber/minHeap";
import type { HeapNode } from "@/fiber/minHeap";

describe("minHeap", () => {
	test("peek returns undefined on empty heap", () => {
		const heap: HeapNode[] = [];
		expect(peek(heap)).toBeUndefined();
	});

	test("push and peek single element", () => {
		const heap: HeapNode[] = [];
		push(heap, { id: 1, sortIndex: 5 });
		expect(peek(heap)?.sortIndex).toBe(5);
	});

	test("pop returns undefined on empty heap", () => {
		const heap: HeapNode[] = [];
		expect(pop(heap)).toBeUndefined();
	});

	test("pop preserves heap property after remove", () => {
		const heap: HeapNode[] = [];
		push(heap, { id: 1, sortIndex: 3 });
		push(heap, { id: 2, sortIndex: 1 });
		push(heap, { id: 3, sortIndex: 2 });

		expect(pop(heap)?.sortIndex).toBe(1);
		expect(pop(heap)?.sortIndex).toBe(2);
		expect(pop(heap)?.sortIndex).toBe(3);
		expect(pop(heap)).toBeUndefined();
	});

	test("heap ordering with duplicate sortIndex", () => {
		const heap: HeapNode[] = [];
		push(heap, { id: 1, sortIndex: 2 });
		push(heap, { id: 2, sortIndex: 2 });
		push(heap, { id: 3, sortIndex: 2 });

		const a = pop(heap);
		const b = pop(heap);
		const c = pop(heap);
		expect([a?.id, b?.id, c?.id].sort()).toEqual([1, 2, 3]);
	});

	test("large random insert and extract all in order", () => {
		const heap: HeapNode[] = [];
		const values: number[] = [];
		for (let i = 0; i < 100; i++) {
			const v = Math.floor(Math.random() * 1000);
			values.push(v);
			push(heap, { id: i, sortIndex: v });
		}
		values.sort((a, b) => a - b);
		for (const expected of values) {
			expect(pop(heap)?.sortIndex).toBe(expected);
		}
		expect(heap.length).toBe(0);
	});
});
