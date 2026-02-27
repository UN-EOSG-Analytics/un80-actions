# Color Audit

## Gray & Slate tones in use (`src/`)

Two scales are used in parallel — worth consolidating to one for tighter consistency.

### `gray-*` (Tailwind default gray)

| Token       | Uses |
| ----------- | ---- |
| `gray-900`  | 18   |
| `gray-200`  | 14   |
| `gray-600`  | 10   |
| `gray-300`  | 10   |
| `gray-500`  | 6    |
| `gray-400`  | 2    |
| `gray-50`   | 2    |
| `gray-800`  | 1    |
| `gray-700`  | 1    |
| `gray-100`  | 1    |

### `slate-*`

| Token       | Uses |
| ----------- | ---- |
| `slate-900` | 15   |
| `slate-500` | 15   |
| `slate-600` | 14   |
| `slate-400` | 11   |
| `slate-200` | 10   |
| `slate-300` | 9    |
| `slate-100` | 9    |
| `slate-700` | 8    |
| `slate-50`  | 8    |
| `slate-800` | 2    |

## Notes

- `gray-600` and `slate-600` are used interchangeably for secondary text — pick one.
- `gray-900` / `slate-900` both serve as primary text color — consolidate.
- Brand-specific neutral aliases (`trout`, `shuttle-gray`) are defined in `globals.css` and should be preferred over raw gray/slate tokens for UI text.
