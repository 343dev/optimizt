#ifndef GIFSICLE_CONFIG_H
#define GIFSICLE_CONFIG_H

#include <stddef.h>

#define HAVE_CONFIG_H 1
#define GIF_ALLOCATOR_DEFINED 1
#define ENABLE_THREADS 0
#define HAVE_CBRTF 1
#define HAVE_POW 1
#define HAVE_SIMD 0
#define HAVE_INTTYPES_H 1
#define HAVE_STDINT_H 1
#define HAVE_STDLIB_H 1
#define HAVE_STRING_H 1
#define HAVE_SYS_TYPES_H 1
#define HAVE_SYS_STAT_H 1
#define HAVE_UNISTD_H 1
#define HAVE_STRERROR 1
#define HAVE_STRTOUL 1
#define HAVE_MKSTEMP 1
#define HAVE_SNPRINTF 1
#define HAVE_INT64_T 1
#define HAVE_UINT64_T 1
#define HAVE_UINTPTR_T 1
#define HAVE___SYNC_ADD_AND_FETCH 1
#define SIZEOF_FLOAT 4
#define SIZEOF_UNSIGNED_INT 4
#if defined(__wasm32__)
#define SIZEOF_UNSIGNED_LONG 4
#define SIZEOF_VOID_P 4
#else
#define SIZEOF_UNSIGNED_LONG 8
#define SIZEOF_VOID_P 8
#endif
#define PATHNAME_SEPARATOR '/'
/* The native and WebAssembly builds must use the same random sequence. */
int gifsicle_deterministic_rand(void);
#define RANDOM gifsicle_deterministic_rand

/* config.h precedes <stdlib.h>, so this macro also rewrites libc's qsort
   declaration. Keep this signature compatible with the standard function. */
void gifsicle_stable_qsort(void *, size_t, size_t,
                           int (*)(const void *, const void *));
#define qsort gifsicle_stable_qsort

#define VERSION "1.96"
#define PACKAGE "gifsicle"
#define PACKAGE_NAME "gifsicle"
#define PACKAGE_STRING "gifsicle 1.96"
#define PACKAGE_TARNAME "gifsicle"
#define PACKAGE_VERSION "1.96"
#define PACKAGE_BUGREPORT ""
#define PACKAGE_URL ""
#define X_DISPLAY_MISSING 1

#endif
