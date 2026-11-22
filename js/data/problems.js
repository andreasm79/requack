const DIFFICULTY = { E: 'Easy', M: 'Medium', H: 'Hard' };

const RAW = [
  ['Arrays & Hashing', [
    ['Contains Duplicate', 'E', 'b'], ['Valid Anagram', 'E', 'b'], ['Two Sum', 'E', 'b'],
    ['Group Anagrams', 'M', 'b'], ['Top K Frequent Elements', 'M', 'b'], ['Encode and Decode Strings', 'M', 'bp'],
    ['Product of Array Except Self', 'M', 'b'], ['Valid Sudoku', 'M'], ['Longest Consecutive Sequence', 'M', 'b'],
  ]],
  ['Two Pointers', [
    ['Valid Palindrome', 'E', 'b'], ['Two Sum II - Input Array Is Sorted', 'M'], ['3Sum', 'M', 'b'],
    ['Container With Most Water', 'M', 'b'], ['Trapping Rain Water', 'H'],
  ]],
  ['Sliding Window', [
    ['Best Time to Buy and Sell Stock', 'E', 'b'], ['Longest Substring Without Repeating Characters', 'M', 'b'],
    ['Longest Repeating Character Replacement', 'M', 'b'], ['Permutation in String', 'M'],
    ['Minimum Window Substring', 'H', 'b'], ['Sliding Window Maximum', 'H'],
  ]],
  ['Stack', [
    ['Valid Parentheses', 'E', 'b'], ['Min Stack', 'M'], ['Evaluate Reverse Polish Notation', 'M'],
    ['Generate Parentheses', 'M'], ['Daily Temperatures', 'M'], ['Car Fleet', 'M'],
    ['Largest Rectangle in Histogram', 'H'],
  ]],
  ['Binary Search', [
    ['Binary Search', 'E'], ['Search a 2D Matrix', 'M'], ['Koko Eating Bananas', 'M'],
    ['Find Minimum in Rotated Sorted Array', 'M', 'b'], ['Search in Rotated Sorted Array', 'M', 'b'],
    ['Time Based Key-Value Store', 'M'], ['Median of Two Sorted Arrays', 'H'],
  ]],
  ['Linked List', [
    ['Reverse Linked List', 'E', 'b'], ['Merge Two Sorted Lists', 'E', 'b'], ['Linked List Cycle', 'E', 'b'],
    ['Reorder List', 'M', 'b'], ['Remove Nth Node From End of List', 'M', 'b'],
    ['Copy List with Random Pointer', 'M'], ['Add Two Numbers', 'M'], ['Find the Duplicate Number', 'M'],
    ['LRU Cache', 'M'], ['Merge k Sorted Lists', 'H', 'b'], ['Reverse Nodes in k-Group', 'H'],
  ]],
  ['Trees', [
    ['Invert Binary Tree', 'E', 'b'], ['Maximum Depth of Binary Tree', 'E', 'b'], ['Diameter of Binary Tree', 'E'],
    ['Balanced Binary Tree', 'E'], ['Same Tree', 'E', 'b'], ['Subtree of Another Tree', 'E', 'b'],
    ['Lowest Common Ancestor of a Binary Search Tree', 'M', 'b'], ['Binary Tree Level Order Traversal', 'M', 'b'],
    ['Binary Tree Right Side View', 'M'], ['Count Good Nodes in Binary Tree', 'M'],
    ['Validate Binary Search Tree', 'M', 'b'], ['Kth Smallest Element in a BST', 'M', 'b'],
    ['Construct Binary Tree from Preorder and Inorder Traversal', 'M', 'b'],
    ['Binary Tree Maximum Path Sum', 'H', 'b'], ['Serialize and Deserialize Binary Tree', 'H', 'b'],
  ]],
  ['Heap / Priority Queue', [
    ['Kth Largest Element in a Stream', 'E'], ['Last Stone Weight', 'E'], ['K Closest Points to Origin', 'M'],
    ['Kth Largest Element in an Array', 'M'], ['Task Scheduler', 'M'], ['Design Twitter', 'M'],
    ['Find Median from Data Stream', 'H', 'b'],
  ]],
  ['Backtracking', [
    ['Subsets', 'M'], ['Combination Sum', 'M', 'b'], ['Permutations', 'M'], ['Subsets II', 'M'],
    ['Combination Sum II', 'M'], ['Word Search', 'M', 'b'], ['Palindrome Partitioning', 'M'],
    ['Letter Combinations of a Phone Number', 'M'], ['N-Queens', 'H'],
  ]],
  ['Tries', [
    ['Implement Trie (Prefix Tree)', 'M', 'b'], ['Design Add and Search Words Data Structure', 'M', 'b'],
    ['Word Search II', 'H', 'b'],
  ]],
  ['Graphs', [
    ['Number of Islands', 'M', 'b'], ['Max Area of Island', 'M'], ['Clone Graph', 'M', 'b'],
    ['Walls and Gates', 'M', 'p'], ['Rotting Oranges', 'M'], ['Pacific Atlantic Water Flow', 'M', 'b'],
    ['Surrounded Regions', 'M'], ['Course Schedule', 'M', 'b'], ['Course Schedule II', 'M'],
    ['Graph Valid Tree', 'M', 'bp'], ['Number of Connected Components in an Undirected Graph', 'M', 'bp'],
    ['Redundant Connection', 'M'], ['Word Ladder', 'H'],
  ]],
  ['Advanced Graphs', [
    ['Reconstruct Itinerary', 'H'], ['Min Cost to Connect All Points', 'M'], ['Network Delay Time', 'M'],
    ['Swim in Rising Water', 'H'], ['Alien Dictionary', 'H', 'bp'], ['Cheapest Flights Within K Stops', 'M'],
  ]],
  ['1-D Dynamic Programming', [
    ['Climbing Stairs', 'E', 'b'], ['Min Cost Climbing Stairs', 'E'], ['House Robber', 'M', 'b'],
    ['House Robber II', 'M', 'b'], ['Longest Palindromic Substring', 'M', 'b'], ['Palindromic Substrings', 'M', 'b'],
    ['Decode Ways', 'M', 'b'], ['Coin Change', 'M', 'b'], ['Maximum Product Subarray', 'M', 'b'],
    ['Word Break', 'M', 'b'], ['Longest Increasing Subsequence', 'M', 'b'], ['Partition Equal Subset Sum', 'M'],
  ]],
  ['2-D Dynamic Programming', [
    ['Unique Paths', 'M', 'b'], ['Longest Common Subsequence', 'M', 'b'],
    ['Best Time to Buy and Sell Stock with Cooldown', 'M'], ['Coin Change II', 'M'], ['Target Sum', 'M'],
    ['Interleaving String', 'M'], ['Longest Increasing Path in a Matrix', 'H'], ['Distinct Subsequences', 'H'],
    ['Edit Distance', 'M'], ['Burst Balloons', 'H'], ['Regular Expression Matching', 'H'],
  ]],
  ['Greedy', [
    ['Maximum Subarray', 'M', 'b'], ['Jump Game', 'M', 'b'], ['Jump Game II', 'M'], ['Gas Station', 'M'],
    ['Hand of Straights', 'M'], ['Merge Triplets to Form Target Triplet', 'M'], ['Partition Labels', 'M'],
    ['Valid Parenthesis String', 'M'],
  ]],
  ['Intervals', [
    ['Insert Interval', 'M', 'b'], ['Merge Intervals', 'M', 'b'], ['Non-overlapping Intervals', 'M', 'b'],
    ['Meeting Rooms', 'E', 'bp'], ['Meeting Rooms II', 'M', 'bp'], ['Minimum Interval to Include Each Query', 'H'],
  ]],
  ['Math & Geometry', [
    ['Rotate Image', 'M', 'b'], ['Spiral Matrix', 'M', 'b'], ['Set Matrix Zeroes', 'M', 'b'], ['Happy Number', 'E'],
    ['Plus One', 'E'], ['Pow(x, n)', 'M'], ['Multiply Strings', 'M'], ['Detect Squares', 'M'],
  ]],
  ['Bit Manipulation', [
    ['Single Number', 'E'], ['Number of 1 Bits', 'E', 'b'], ['Counting Bits', 'E', 'b'], ['Reverse Bits', 'E', 'b'],
    ['Missing Number', 'E', 'b'], ['Sum of Two Integers', 'M', 'b'], ['Reverse Integer', 'M'],
  ]],
];

export function slugify(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/[\s-]+/g, '-');
}

export const PATTERNS = RAW.map(([pattern]) => pattern);

export const PROBLEMS = RAW.flatMap(([pattern, items]) =>
  items.map(([title, level, flags = '']) => {
    const id = slugify(title);
    return {
      id,
      title,
      pattern,
      difficulty: DIFFICULTY[level],
      blind75: flags.includes('b'),
      premium: flags.includes('p'),
      kind: 'coding',
      url: `https://leetcode.com/problems/${id}/`,
      prompt: '',
      custom: false,
    };
  })
);

import { RUNNABLE_IDS } from './runnable-index.js';

export const LISTS = {
  neetcode150: { label: 'NeetCode 150', filter: () => true },
  blind75: { label: 'Blind 75', filter: (problem) => problem.blind75 },
  runnable: { label: 'Solvable in Requack', filter: (problem) => RUNNABLE_IDS.includes(problem.id) },
};
