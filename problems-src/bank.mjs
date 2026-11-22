// Source for the runnable problem bank. Statements are original wording.
// Reference solutions and generators run at build time only; the app ships the generated tests.

const range = (n) => Array.from({ length: n }, (_, i) => i);

export const BANK = [
  {
    id: 'contains-duplicate',
    title: 'Contains Duplicate',
    difficulty: 'Easy',
    fn: { python: 'contains_duplicate', js: 'containsDuplicate' },
    params: [['nums', 'int[]']],
    returns: 'bool',
    statement: [
      'You get a list of integers. Return true if any value shows up at least twice, and false if every value is distinct.',
    ],
    examples: [[[4, 9, 1, 4]], [[3, 1, 2]]],
    constraints: ['0 ≤ len(nums) ≤ 100,000', '-10⁹ ≤ nums[i] ≤ 10⁹'],
    edge: [[[]], [[7]], [[2, 2]]],
    gen: (r) => {
      const n = r.int(1, 40);
      const nums = range(n).map(() => r.int(-50, 50));
      return [nums];
    },
    large: (r) => [range(20000).map((i) => i * 3 - 7)],
    solve: (nums) => new Set(nums).size !== nums.length,
  },
  {
    id: 'valid-anagram',
    title: 'Valid Anagram',
    difficulty: 'Easy',
    fn: { python: 'is_anagram', js: 'isAnagram' },
    params: [['s', 'str'], ['t', 'str']],
    returns: 'bool',
    statement: [
      'Two lowercase words are anagrams when one can be rearranged into the other, using every letter exactly once.',
      'Return true if s and t are anagrams of each other.',
    ],
    examples: [['listen', 'silent'], ['duck', 'dock']],
    constraints: ['0 ≤ len(s), len(t) ≤ 50,000', 'only lowercase English letters'],
    edge: [['', ''], ['a', ''], ['ab', 'ba'], ['aab', 'abb']],
    gen: (r) => {
      const s = r.word(r.int(1, 12), 'abcde');
      const t = r.chance(0.5) ? r.shuffle([...s]).join('') : r.word(s.length + r.int(-1, 1), 'abcde');
      return [s, t];
    },
    solve: (s, t) => [...s].sort().join('') === [...t].sort().join(''),
  },
  {
    id: 'two-sum',
    title: 'Two Sum',
    difficulty: 'Easy',
    fn: { python: 'two_sum', js: 'twoSum' },
    params: [['nums', 'int[]'], ['target', 'int']],
    returns: 'int[]',
    compare: 'unordered',
    statement: [
      'Find the two different positions i and j where nums[i] + nums[j] equals target, and return them as [i, j].',
      'Every test has exactly one valid pair. The order of the two indices does not matter.',
    ],
    examples: [[[3, 8, 11, 5], 13], [[6, 6], 12]],
    constraints: ['2 ≤ len(nums) ≤ 50,000', 'exactly one answer exists'],
    edge: [[[-3, 4, 3, 90], 0], [[0, 4, 3, 0], 0]],
    gen: (r) => {
      for (;;) {
        const n = r.int(2, 20);
        const nums = range(n).map(() => r.int(-30, 30));
        const [i, j] = r.pair(n);
        const target = nums[i] + nums[j];
        let count = 0;
        for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) if (nums[a] + nums[b] === target) count++;
        if (count === 1) return [nums, target];
      }
    },
    large: () => {
      const nums = range(20000).map((i) => i * 2);
      nums[19999] = 1;
      return [nums, 39997];
    },
    solve: (nums, target) => {
      const seen = new Map();
      for (let i = 0; i < nums.length; i++) {
        if (seen.has(target - nums[i])) return [seen.get(target - nums[i]), i];
        seen.set(nums[i], i);
      }
      return [];
    },
  },
  {
    id: 'group-anagrams',
    title: 'Group Anagrams',
    difficulty: 'Medium',
    fn: { python: 'group_anagrams', js: 'groupAnagrams' },
    params: [['words', 'str[]']],
    returns: 'str[][]',
    compare: 'groups',
    statement: [
      'Put the words into groups so that each group holds words that are anagrams of each other, and every word is in exactly one group.',
      'Return the groups in any order, with the words inside each group in any order.',
    ],
    examples: [[['tea', 'ate', 'bat', 'eat', 'tab', 'cat']], [['']]],
    constraints: ['1 ≤ len(words) ≤ 10,000', '0 ≤ len(words[i]) ≤ 100, lowercase letters'],
    edge: [[['a']], [['ab', 'ba', 'ab']]],
    gen: (r) => [range(r.int(1, 15)).map(() => r.word(r.int(0, 4), 'abc'))],
    solve: (words) => {
      const groups = new Map();
      for (const word of words) {
        const key = [...word].sort().join('');
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(word);
      }
      return [...groups.values()];
    },
  },
  {
    id: 'top-k-frequent-elements',
    title: 'Top K Frequent Elements',
    difficulty: 'Medium',
    fn: { python: 'top_k_frequent', js: 'topKFrequent' },
    params: [['nums', 'int[]'], ['k', 'int']],
    returns: 'int[]',
    compare: 'unordered',
    statement: [
      'Return the k values that appear most often in nums, in any order.',
      'Tests are built so the answer is unique: there is never a tie at the cut-off.',
    ],
    examples: [[[5, 5, 5, 2, 2, 9], 2], [[7], 1]],
    constraints: ['1 ≤ len(nums) ≤ 100,000', '1 ≤ k ≤ number of distinct values'],
    edge: [[[1, 2], 2]],
    gen: (r) => {
      const distinct = r.int(1, 7);
      const values = r.shuffle(range(20).map((i) => i - 10)).slice(0, distinct);
      const counts = r.shuffle(range(distinct).map((i) => i + 1));
      const nums = r.shuffle(values.flatMap((v, i) => Array(counts[i]).fill(v)));
      return [nums, r.int(1, distinct)];
    },
    solve: (nums, k) => {
      const counts = new Map();
      for (const n of nums) counts.set(n, (counts.get(n) || 0) + 1);
      return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, k).map(([v]) => v);
    },
  },
  {
    id: 'product-of-array-except-self',
    title: 'Product of Array Except Self',
    difficulty: 'Medium',
    fn: { python: 'product_except_self', js: 'productExceptSelf' },
    params: [['nums', 'int[]']],
    returns: 'int[]',
    statement: [
      'Return a list where position i holds the product of every element of nums except nums[i].',
      'Do it in O(n) time without using division.',
    ],
    examples: [[[2, 3, 4, 5]], [[-1, 1, 0, -3, 3]]],
    constraints: ['2 ≤ len(nums) ≤ 100,000', 'every product fits in a 32-bit integer'],
    edge: [[[0, 0]], [[1, 0]]],
    gen: (r) => [range(r.int(2, 8)).map(() => r.int(-4, 4))],
    solve: (nums) => nums.map((_, i) => nums.reduce((p, v, j) => (j === i ? p : p * v), 1) + 0),
  },
  {
    id: 'longest-consecutive-sequence',
    title: 'Longest Consecutive Sequence',
    difficulty: 'Medium',
    fn: { python: 'longest_consecutive', js: 'longestConsecutive' },
    params: [['nums', 'int[]']],
    returns: 'int',
    statement: [
      'nums is unsorted. Return the length of the longest run of consecutive integers (like 4, 5, 6, 7) that can be built from its values.',
      'Aim for O(n) time.',
    ],
    examples: [[[10, 4, 20, 1, 3, 2]], [[0, 3, 7, 2, 5, 8, 4, 6, 0, 1]]],
    constraints: ['0 ≤ len(nums) ≤ 100,000'],
    edge: [[[]], [[5]], [[1, 1, 1]]],
    gen: (r) => [range(r.int(0, 20)).map(() => r.int(-10, 10))],
    large: () => [range(20000).map((i) => (i * 7919) % 20000)],
    solve: (nums) => {
      const set = new Set(nums);
      let best = 0;
      for (const n of set) {
        if (set.has(n - 1)) continue;
        let len = 1;
        while (set.has(n + len)) len++;
        best = Math.max(best, len);
      }
      return best;
    },
  },
  {
    id: 'valid-palindrome',
    title: 'Valid Palindrome',
    difficulty: 'Easy',
    fn: { python: 'is_palindrome', js: 'isPalindrome' },
    params: [['s', 'str']],
    returns: 'bool',
    statement: [
      'Ignore everything that is not a letter or a digit, and ignore case. Return true if what is left reads the same forwards and backwards.',
    ],
    examples: [['Was it a car or a cat I saw?'], ['race a car']],
    constraints: ['0 ≤ len(s) ≤ 200,000', 'printable ASCII'],
    edge: [[''], ['.,'], ['0P']],
    gen: (r) => {
      const half = r.word(r.int(0, 6), 'abAB1 ,.');
      const s = r.chance(0.5) ? half + [...half].reverse().join('') : half + r.word(r.int(1, 3), 'abc');
      return [s];
    },
    solve: (s) => {
      const clean = s.toLowerCase().replace(/[^a-z0-9]/g, '');
      return clean === [...clean].reverse().join('');
    },
  },
  {
    id: '3sum',
    title: '3Sum',
    difficulty: 'Medium',
    fn: { python: 'three_sum', js: 'threeSum' },
    params: [['nums', 'int[]']],
    returns: 'int[][]',
    compare: 'sets',
    statement: [
      'Return every distinct triple of values [a, b, c] taken from three different positions of nums with a + b + c = 0.',
      'No triple may appear twice. Triples and the values inside them can be in any order.',
    ],
    examples: [[[-1, 0, 1, 2, -1, -4]], [[0, 0, 0, 0]]],
    constraints: ['3 ≤ len(nums) ≤ 3,000'],
    edge: [[[1, 2, 3]], [[0, 0, 0]]],
    gen: (r) => [range(r.int(3, 14)).map(() => r.int(-6, 6))],
    solve: (nums) => {
      const sorted = [...nums].sort((a, b) => a - b);
      const out = [];
      for (let i = 0; i < sorted.length; i++) {
        if (i > 0 && sorted[i] === sorted[i - 1]) continue;
        let lo = i + 1;
        let hi = sorted.length - 1;
        while (lo < hi) {
          const sum = sorted[i] + sorted[lo] + sorted[hi];
          if (sum < 0) lo++;
          else if (sum > 0) hi--;
          else {
            out.push([sorted[i], sorted[lo], sorted[hi]]);
            while (lo < hi && sorted[lo] === sorted[lo + 1]) lo++;
            lo++;
            hi--;
          }
        }
      }
      return out;
    },
  },
  {
    id: 'container-with-most-water',
    title: 'Container With Most Water',
    difficulty: 'Medium',
    fn: { python: 'max_area', js: 'maxArea' },
    params: [['heights', 'int[]']],
    returns: 'int',
    statement: [
      'heights[i] is the height of a vertical wall at x = i. Pick two walls; together with the floor they hold water up to the shorter wall.',
      'Return the largest amount of water any pair can hold: width times the shorter height.',
    ],
    examples: [[[1, 8, 6, 2, 5, 4, 8, 3, 7]], [[1, 1]]],
    constraints: ['2 ≤ len(heights) ≤ 100,000', '0 ≤ heights[i] ≤ 10,000'],
    edge: [[[0, 0]], [[4, 3, 2, 1, 4]]],
    gen: (r) => [range(r.int(2, 15)).map(() => r.int(0, 12))],
    large: () => [range(20000).map((i) => (i * 37) % 10001)],
    solve: (h) => {
      let lo = 0;
      let hi = h.length - 1;
      let best = 0;
      while (lo < hi) {
        best = Math.max(best, (hi - lo) * Math.min(h[lo], h[hi]));
        if (h[lo] < h[hi]) lo++;
        else hi--;
      }
      return best;
    },
  },
  {
    id: 'best-time-to-buy-and-sell-stock',
    title: 'Best Time to Buy and Sell Stock',
    difficulty: 'Easy',
    fn: { python: 'max_profit', js: 'maxProfit' },
    params: [['prices', 'int[]']],
    returns: 'int',
    statement: [
      'prices[i] is a share price on day i. Buy on one day and sell on a later day. Return the biggest profit possible, or 0 if no trade makes money.',
    ],
    examples: [[[7, 1, 5, 3, 6, 4]], [[9, 7, 4, 1]]],
    constraints: ['1 ≤ len(prices) ≤ 100,000'],
    edge: [[[5]], [[1, 2]]],
    gen: (r) => [range(r.int(1, 15)).map(() => r.int(0, 20))],
    large: () => [range(20000).map((i) => 100000 - i)],
    solve: (prices) => {
      let low = Infinity;
      let best = 0;
      for (const p of prices) {
        low = Math.min(low, p);
        best = Math.max(best, p - low);
      }
      return best;
    },
  },
  {
    id: 'longest-substring-without-repeating-characters',
    title: 'Longest Substring Without Repeating Characters',
    difficulty: 'Medium',
    fn: { python: 'length_of_longest_substring', js: 'lengthOfLongestSubstring' },
    params: [['s', 'str']],
    returns: 'int',
    statement: [
      'Return the length of the longest contiguous piece of s in which no character repeats.',
    ],
    examples: [['abcabcbb'], ['pwwkew']],
    constraints: ['0 ≤ len(s) ≤ 50,000'],
    edge: [[''], [' '], ['dvdf']],
    gen: (r) => [r.word(r.int(0, 20), 'abcdef')],
    solve: (s) => {
      const last = new Map();
      let start = 0;
      let best = 0;
      for (let i = 0; i < s.length; i++) {
        if (last.has(s[i]) && last.get(s[i]) >= start) start = last.get(s[i]) + 1;
        last.set(s[i], i);
        best = Math.max(best, i - start + 1);
      }
      return best;
    },
  },
  {
    id: 'valid-parentheses',
    title: 'Valid Parentheses',
    difficulty: 'Easy',
    fn: { python: 'is_valid', js: 'isValid' },
    params: [['s', 'str']],
    returns: 'bool',
    statement: [
      's contains only the characters ( ) [ ] { }. Return true if every opening bracket is closed by the same type of bracket, in the right order.',
    ],
    examples: [['([]{})'], ['(]']],
    constraints: ['1 ≤ len(s) ≤ 10,000'],
    edge: [['('], [']'], ['([)]']],
    gen: (r) => [r.word(r.int(1, 12), '()[]{}')],
    solve: (s) => {
      const stack = [];
      const pairs = { ')': '(', ']': '[', '}': '{' };
      for (const c of s) {
        if (pairs[c]) {
          if (stack.pop() !== pairs[c]) return false;
        } else stack.push(c);
      }
      return stack.length === 0;
    },
  },
  {
    id: 'daily-temperatures',
    title: 'Daily Temperatures',
    difficulty: 'Medium',
    fn: { python: 'daily_temperatures', js: 'dailyTemperatures' },
    params: [['temps', 'int[]']],
    returns: 'int[]',
    statement: [
      'For each day, return how many days you have to wait until a strictly warmer day. Use 0 if no warmer day comes.',
    ],
    examples: [[[73, 74, 75, 71, 69, 72, 76, 73]], [[30, 30, 30]]],
    constraints: ['1 ≤ len(temps) ≤ 100,000'],
    edge: [[[50]]],
    gen: (r) => [range(r.int(1, 15)).map(() => r.int(30, 40))],
    large: () => [range(20000).map((i) => 100 - (i % 50))],
    solve: (t) => {
      const out = Array(t.length).fill(0);
      const stack = [];
      for (let i = 0; i < t.length; i++) {
        while (stack.length && t[stack[stack.length - 1]] < t[i]) {
          const j = stack.pop();
          out[j] = i - j;
        }
        stack.push(i);
      }
      return out;
    },
  },
  {
    id: 'binary-search',
    title: 'Binary Search',
    difficulty: 'Easy',
    fn: { python: 'search', js: 'search' },
    params: [['nums', 'int[]'], ['target', 'int']],
    returns: 'int',
    statement: [
      'nums is sorted in increasing order with no duplicates. Return the index of target, or -1 if it is not there. Use O(log n) time.',
    ],
    examples: [[[-1, 0, 3, 5, 9, 12], 9], [[-1, 0, 3, 5, 9, 12], 2]],
    constraints: ['1 ≤ len(nums) ≤ 100,000'],
    edge: [[[5], 5], [[5], -5], [[1, 3], 3]],
    gen: (r) => {
      const nums = [...new Set(range(r.int(1, 15)).map(() => r.int(-20, 20)))].sort((a, b) => a - b);
      return [nums, r.int(-22, 22)];
    },
    solve: (nums, target) => nums.indexOf(target),
  },
  {
    id: 'koko-eating-bananas',
    title: 'Koko Eating Bananas',
    difficulty: 'Medium',
    fn: { python: 'min_eating_speed', js: 'minEatingSpeed' },
    params: [['piles', 'int[]'], ['h', 'int']],
    returns: 'int',
    statement: [
      'Each hour, a duck picks one pile and eats up to k bread rolls from it (if the pile has fewer, it eats the rest and waits out the hour).',
      'Return the smallest whole number k that lets it finish every pile within h hours.',
    ],
    examples: [[[3, 6, 7, 11], 8], [[30, 11, 23, 4, 20], 5]],
    constraints: ['1 ≤ len(piles) ≤ h ≤ 10⁹', '1 ≤ piles[i] ≤ 10⁹'],
    edge: [[[1], 1], [[1000000000], 2]],
    gen: (r) => {
      const piles = range(r.int(1, 8)).map(() => r.int(1, 40));
      return [piles, piles.length + r.int(0, 10)];
    },
    solve: (piles, h) => {
      let lo = 1;
      let hi = Math.max(...piles);
      while (lo < hi) {
        const mid = Math.floor((lo + hi) / 2);
        const hours = piles.reduce((sum, p) => sum + Math.ceil(p / mid), 0);
        if (hours <= h) hi = mid;
        else lo = mid + 1;
      }
      return lo;
    },
  },
  {
    id: 'search-in-rotated-sorted-array',
    title: 'Search in Rotated Sorted Array',
    difficulty: 'Medium',
    fn: { python: 'search_rotated', js: 'searchRotated' },
    params: [['nums', 'int[]'], ['target', 'int']],
    returns: 'int',
    statement: [
      'A sorted list of distinct integers was rotated at an unknown point, like [4, 5, 6, 7, 0, 1, 2]. Return the index of target, or -1. Use O(log n) time.',
    ],
    examples: [[[4, 5, 6, 7, 0, 1, 2], 0], [[4, 5, 6, 7, 0, 1, 2], 3]],
    constraints: ['1 ≤ len(nums) ≤ 5,000', 'values are distinct'],
    edge: [[[1], 0], [[1, 3], 3], [[3, 1], 1]],
    gen: (r) => {
      const sorted = [...new Set(range(r.int(1, 12)).map(() => r.int(0, 30)))].sort((a, b) => a - b);
      const k = r.int(0, sorted.length - 1);
      return [[...sorted.slice(k), ...sorted.slice(0, k)], r.int(-1, 31)];
    },
    solve: (nums, target) => nums.indexOf(target),
  },
  {
    id: 'climbing-stairs',
    title: 'Climbing Stairs',
    difficulty: 'Easy',
    fn: { python: 'climb_stairs', js: 'climbStairs' },
    params: [['n', 'int']],
    returns: 'int',
    statement: ['You climb a staircase of n steps, taking 1 or 2 steps at a time. Return how many different ways you can reach the top.'],
    examples: [[2], [5]],
    constraints: ['1 ≤ n ≤ 45'],
    edge: [[1], [45]],
    gen: (r) => [r.int(1, 30)],
    solve: (n) => {
      let a = 1;
      let b = 1;
      for (let i = 0; i < n; i++) [a, b] = [b, a + b];
      return a;
    },
  },
  {
    id: 'house-robber',
    title: 'House Robber',
    difficulty: 'Medium',
    fn: { python: 'rob', js: 'rob' },
    params: [['nums', 'int[]']],
    returns: 'int',
    statement: [
      'nums[i] is how much a stall at a society fair raises if it is open. Two neighbouring stalls cannot both open. Return the largest total the fair can raise.',
    ],
    examples: [[[1, 2, 3, 1]], [[2, 7, 9, 3, 1]]],
    constraints: ['1 ≤ len(nums) ≤ 100,000', '0 ≤ nums[i] ≤ 400'],
    edge: [[[5]], [[2, 1]]],
    gen: (r) => [range(r.int(1, 15)).map(() => r.int(0, 20))],
    large: () => [range(20000).map((i) => i % 400)],
    solve: (nums) => {
      let take = 0;
      let skip = 0;
      for (const n of nums) [take, skip] = [skip + n, Math.max(take, skip)];
      return Math.max(take, skip);
    },
  },
  {
    id: 'coin-change',
    title: 'Coin Change',
    difficulty: 'Medium',
    fn: { python: 'coin_change', js: 'coinChange' },
    params: [['coins', 'int[]'], ['amount', 'int']],
    returns: 'int',
    statement: [
      'You have unlimited coins of each value in coins. Return the fewest coins that add up to exactly amount, or -1 if it cannot be done.',
    ],
    examples: [[[1, 2, 5], 11], [[2], 3]],
    constraints: ['1 ≤ len(coins) ≤ 12', '0 ≤ amount ≤ 10,000'],
    edge: [[[1], 0], [[7], 7], [[186, 419, 83, 408], 6249]],
    gen: (r) => [[...new Set(range(r.int(1, 4)).map(() => r.int(1, 12)))], r.int(0, 60)],
    solve: (coins, amount) => {
      const dp = Array(amount + 1).fill(Infinity);
      dp[0] = 0;
      for (let a = 1; a <= amount; a++) for (const c of coins) if (c <= a) dp[a] = Math.min(dp[a], dp[a - c] + 1);
      return dp[amount] === Infinity ? -1 : dp[amount];
    },
  },
  {
    id: 'longest-increasing-subsequence',
    title: 'Longest Increasing Subsequence',
    difficulty: 'Medium',
    fn: { python: 'length_of_lis', js: 'lengthOfLIS' },
    params: [['nums', 'int[]']],
    returns: 'int',
    statement: [
      'Delete any elements you like from nums (keeping the rest in order). Return the length of the longest result that is strictly increasing.',
    ],
    examples: [[[10, 9, 2, 5, 3, 7, 101, 18]], [[7, 7, 7]]],
    constraints: ['1 ≤ len(nums) ≤ 2,500'],
    edge: [[[1]], [[1, 2, 3, 4]]],
    gen: (r) => [range(r.int(1, 15)).map(() => r.int(-10, 10))],
    solve: (nums) => {
      const tails = [];
      for (const n of nums) {
        let lo = 0;
        let hi = tails.length;
        while (lo < hi) {
          const mid = (lo + hi) >> 1;
          if (tails[mid] < n) lo = mid + 1;
          else hi = mid;
        }
        tails[lo] = n;
      }
      return tails.length;
    },
  },
  {
    id: 'word-break',
    title: 'Word Break',
    difficulty: 'Medium',
    fn: { python: 'word_break', js: 'wordBreak' },
    params: [['s', 'str'], ['words', 'str[]']],
    returns: 'bool',
    statement: [
      'Return true if s can be split into a sequence of one or more words from the list words. Words can be reused.',
    ],
    examples: [['quackquack', ['quack']], ['catsandog', ['cats', 'dog', 'sand', 'and', 'cat']]],
    constraints: ['1 ≤ len(s) ≤ 300', '1 ≤ len(words) ≤ 1,000'],
    edge: [['a', ['b']], ['aaaaaaa', ['aaaa', 'aaa']]],
    gen: (r) => {
      const words = [...new Set(range(r.int(1, 4)).map(() => r.word(r.int(1, 3), 'ab')))];
      const s = r.chance(0.6) ? range(r.int(1, 4)).map(() => r.pick(words)).join('') : r.word(r.int(1, 8), 'ab');
      return [s, words];
    },
    solve: (s, words) => {
      const ok = Array(s.length + 1).fill(false);
      ok[0] = true;
      for (let i = 1; i <= s.length; i++) for (const w of words) if (i >= w.length && ok[i - w.length] && s.slice(i - w.length, i) === w) ok[i] = true;
      return ok[s.length];
    },
  },
  {
    id: 'number-of-islands',
    title: 'Number of Islands',
    difficulty: 'Medium',
    fn: { python: 'num_islands', js: 'numIslands' },
    params: [['grid', 'str[][]']],
    returns: 'int',
    statement: [
      'grid is a map where "1" is land and "0" is water. Land cells that touch up, down, left or right belong to the same island. Return the number of islands.',
    ],
    examples: [[[['1', '1', '0', '0'], ['1', '0', '0', '1'], ['0', '0', '1', '1']]], [[['0']]]],
    constraints: ['1 ≤ rows, cols ≤ 300'],
    edge: [[[['1']]], [[['1', '0', '1', '0', '1']]]],
    gen: (r) => {
      const rows = r.int(1, 6);
      const cols = r.int(1, 6);
      return [range(rows).map(() => range(cols).map(() => (r.chance(0.45) ? '1' : '0')))];
    },
    solve: (grid) => {
      const seen = new Set();
      let count = 0;
      const visit = (i, j) => {
        const stack = [[i, j]];
        while (stack.length) {
          const [a, b] = stack.pop();
          const k = `${a},${b}`;
          if (a < 0 || b < 0 || a >= grid.length || b >= grid[0].length || grid[a][b] !== '1' || seen.has(k)) continue;
          seen.add(k);
          stack.push([a + 1, b], [a - 1, b], [a, b + 1], [a, b - 1]);
        }
      };
      grid.forEach((row, i) => row.forEach((cell, j) => {
        if (cell === '1' && !seen.has(`${i},${j}`)) {
          count++;
          visit(i, j);
        }
      }));
      return count;
    },
  },
  {
    id: 'merge-intervals',
    title: 'Merge Intervals',
    difficulty: 'Medium',
    fn: { python: 'merge', js: 'merge' },
    params: [['intervals', 'int[][]']],
    returns: 'int[][]',
    statement: [
      'Each interval is [start, end]. Merge every group of overlapping intervals (touching counts, so [1, 4] and [4, 5] merge) and return the result sorted by start.',
    ],
    examples: [[[[1, 3], [8, 10], [2, 6], [15, 18]]], [[[1, 4], [4, 5]]]],
    constraints: ['1 ≤ len(intervals) ≤ 10,000', '0 ≤ start ≤ end ≤ 10,000'],
    edge: [[[[1, 1]]], [[[1, 4], [2, 3]]]],
    gen: (r) => [range(r.int(1, 8)).map(() => {
      const a = r.int(0, 20);
      return [a, a + r.int(0, 5)];
    })],
    solve: (intervals) => {
      const sorted = intervals.map((x) => [...x]).sort((a, b) => a[0] - b[0]);
      const out = [];
      for (const [s, e] of sorted) {
        if (out.length && s <= out[out.length - 1][1]) out[out.length - 1][1] = Math.max(out[out.length - 1][1], e);
        else out.push([s, e]);
      }
      return out;
    },
  },
  {
    id: 'maximum-subarray',
    title: 'Maximum Subarray',
    difficulty: 'Medium',
    fn: { python: 'max_sub_array', js: 'maxSubArray' },
    params: [['nums', 'int[]']],
    returns: 'int',
    statement: ['Return the largest sum of any non-empty contiguous slice of nums.'],
    examples: [[[-2, 1, -3, 4, -1, 2, 1, -5, 4]], [[-3, -1, -2]]],
    constraints: ['1 ≤ len(nums) ≤ 100,000'],
    edge: [[[5]], [[-1]]],
    gen: (r) => [range(r.int(1, 15)).map(() => r.int(-10, 10))],
    large: () => [range(20000).map((i) => ((i * 31) % 21) - 10)],
    solve: (nums) => {
      let best = -Infinity;
      let cur = 0;
      for (const n of nums) {
        cur = Math.max(n, cur + n);
        best = Math.max(best, cur);
      }
      return best;
    },
  },
  {
    id: 'jump-game',
    title: 'Jump Game',
    difficulty: 'Medium',
    fn: { python: 'can_jump', js: 'canJump' },
    params: [['nums', 'int[]']],
    returns: 'bool',
    statement: [
      'You start at index 0. From index i you may jump forward by up to nums[i] places. Return true if you can reach the last index.',
    ],
    examples: [[[2, 3, 1, 1, 4]], [[3, 2, 1, 0, 4]]],
    constraints: ['1 ≤ len(nums) ≤ 10,000'],
    edge: [[[0]], [[0, 1]]],
    gen: (r) => [range(r.int(1, 12)).map(() => r.int(0, 3))],
    solve: (nums) => {
      let reach = 0;
      for (let i = 0; i < nums.length; i++) {
        if (i > reach) return false;
        reach = Math.max(reach, i + nums[i]);
      }
      return true;
    },
  },
  {
    id: 'subsets',
    title: 'Subsets',
    difficulty: 'Medium',
    fn: { python: 'subsets', js: 'subsets' },
    params: [['nums', 'int[]']],
    returns: 'int[][]',
    compare: 'sets',
    statement: ['nums has distinct values. Return every possible subset, including the empty one, with no subset twice. Any order.'],
    examples: [[[1, 2, 3]], [[0]]],
    constraints: ['1 ≤ len(nums) ≤ 10'],
    edge: [[[5, -5]]],
    gen: (r) => [[...new Set(range(r.int(1, 5)).map(() => r.int(-9, 9)))]],
    solve: (nums) => nums.reduce((all, n) => [...all, ...all.map((s) => [...s, n])], [[]]),
  },
  {
    id: 'trapping-rain-water',
    title: 'Trapping Rain Water',
    difficulty: 'Hard',
    fn: { python: 'trap', js: 'trap' },
    params: [['height', 'int[]']],
    returns: 'int',
    statement: [
      'height describes a skyline of bars, each 1 unit wide. After heavy rain, water settles between the bars. Return how many units of water are trapped.',
    ],
    examples: [[[0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1]], [[4, 2, 0, 3, 2, 5]]],
    constraints: ['1 ≤ len(height) ≤ 100,000'],
    edge: [[[1]], [[3, 0, 3]]],
    gen: (r) => [range(r.int(1, 14)).map(() => r.int(0, 6))],
    large: () => [range(20000).map((i) => (i * 13) % 50)],
    solve: (h) => {
      let lo = 0;
      let hi = h.length - 1;
      let leftMax = 0;
      let rightMax = 0;
      let water = 0;
      while (lo < hi) {
        if (h[lo] < h[hi]) {
          leftMax = Math.max(leftMax, h[lo]);
          water += leftMax - h[lo++];
        } else {
          rightMax = Math.max(rightMax, h[hi]);
          water += rightMax - h[hi--];
        }
      }
      return water;
    },
  },
  {
    id: 'edit-distance',
    title: 'Edit Distance',
    difficulty: 'Hard',
    fn: { python: 'min_distance', js: 'minDistance' },
    params: [['a', 'str'], ['b', 'str']],
    returns: 'int',
    statement: [
      'One edit is inserting, deleting or replacing a single character. Return the fewest edits that turn word a into word b.',
    ],
    examples: [['horse', 'ros'], ['intention', 'execution']],
    constraints: ['0 ≤ len(a), len(b) ≤ 500'],
    edge: [['', ''], ['', 'abc'], ['same', 'same']],
    gen: (r) => [r.word(r.int(0, 8), 'abcd'), r.word(r.int(0, 8), 'abcd')],
    solve: (a, b) => {
      let prev = range(b.length + 1);
      for (let i = 1; i <= a.length; i++) {
        const cur = [i];
        for (let j = 1; j <= b.length; j++) {
          cur[j] = a[i - 1] === b[j - 1] ? prev[j - 1] : 1 + Math.min(prev[j - 1], prev[j], cur[j - 1]);
        }
        prev = cur;
      }
      return prev[b.length];
    },
  },
];
