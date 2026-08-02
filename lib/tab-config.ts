// Bottom-bar tab defaults. Pure constants (no 'use client') so both server
// (loadUserProfile) and client can import them. "More" is always the fixed 5th
// slot, so it isn't part of the configurable list.

export const DEFAULT_TABS = ['home', 'recipes', 'planner', 'grocery'];
export const MAX_TABS = 4;
