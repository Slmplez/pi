# Limiter (MBFS)

| Column 1 | Column 2 |
| --- | --- |
|  | Limiter returns the input value u limited by MX and MN . The increasing value domain is split in different intervals depending on the limitation values. The boolean output flags B_MAX and B_MIN represent an active limitation in both directions. |

| Column 1 | Column 2 | Column 3 |
| --- | --- | --- |
| Methods | Arguments | Return Value |
| compute | MX :: continuous |  |
|  | MN :: continuous |  |
|  | u :: continuous |  |
| B_max | none | logical |
| B_min | none | logical |
| y | none | continuous |

On activation of method

compute

Buffers y = MX, B_max = TRUE, B_min = FALSE, if u > MX. Buffers y = MN, B_max = FALSE, B_min = TRUE, if u < MN. Otherwise the Limiter buffers y = u, B_max = FALSE, B_min = FALSE.

B_max

Returns the buffered state B_max.

B_min

Returns the buffered state B_min.

y

Returns the buffered value y.
