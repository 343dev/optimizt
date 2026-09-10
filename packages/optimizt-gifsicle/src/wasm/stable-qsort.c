/* Stable qsort compatibility for WebAssembly builds.
   Copyright (C) 2026 Andrey Warkentin
   SPDX-License-Identifier: GPL-2.0-only */

#include <stddef.h>
#include <stdint.h>
#include <string.h>
#include <lcdfgif/gif.h>

int
gifsicle_deterministic_rand(void)
{
  static uint32_t state = 1;
  state ^= state << 13;
  state ^= state >> 17;
  state ^= state << 5;
  return (int) (state & 0x7FFFFFFFU);
}

void
gifsicle_stable_qsort(void *base, size_t count, size_t size,
                      int (*compare)(const void *, const void *))
{
  unsigned char *values = base;
  unsigned char *scratch;
  unsigned char *source;
  unsigned char *destination;
  size_t width;

  if (count < 2 || size == 0)
    return;

  scratch = Gif_Realloc(NULL, size, count, __FILE__, __LINE__);
  source = values;
  destination = scratch;

  for (width = 1; width < count;) {
    size_t start;
    for (start = 0; start < count; start += width * 2) {
      size_t left = start;
      size_t middle = start + width < count ? start + width : count;
      size_t right = middle;
      size_t end = middle + width < count ? middle + width : count;
      size_t output = start;

      while (left < middle && right < end) {
        size_t selected;
        if (compare(source + left * size, source + right * size) <= 0)
          selected = left++;
        else
          selected = right++;
        memcpy(destination + output++ * size, source + selected * size, size);
      }
      while (left < middle) {
        memcpy(destination + output++ * size, source + left++ * size, size);
      }
      while (right < end) {
        memcpy(destination + output++ * size, source + right++ * size, size);
      }
    }

    {
      unsigned char *temporary = source;
      source = destination;
      destination = temporary;
    }
    if (width > count / 2)
      width = count;
    else
      width *= 2;
  }

  if (source != values)
    memcpy(values, source, count * size);
  Gif_Free(scratch);
}
