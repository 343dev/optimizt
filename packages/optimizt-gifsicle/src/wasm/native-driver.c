/* Native parity driver for the filesystem-free Gifsicle bridge.
   Copyright (C) 2026 Andrey Warkentin
   SPDX-License-Identifier: GPL-2.0-only */

#include <stdio.h>
#include <stdlib.h>
#include <stdint.h>

int gifsicle_optimize(const uint8_t *data, uint32_t length,
                      int optimize, int careful, int colors, int lossy,
                      int gamma_type, double gamma);
const uint8_t *gifsicle_output_data(void);
uint32_t gifsicle_output_size(void);
const char *gifsicle_error_message(void);
void gifsicle_reset(void);

int
main(int argc, char **argv)
{
  FILE *file;
  uint8_t *input;
  long size;
  int optimize;
  int careful;
  int colors;
  int lossy;
  int gamma_type;
  double gamma;
  int status;

  if (argc != 9) {
    fprintf(stderr, "usage: %s input optimize careful colors lossy gamma-type gamma output\n", argv[0]);
    return 2;
  }

  file = fopen(argv[1], "rb");
  if (!file || fseek(file, 0, SEEK_END) || (size = ftell(file)) < 0
      || size > UINT32_MAX || fseek(file, 0, SEEK_SET)) {
    fprintf(stderr, "could not inspect input\n");
    return 3;
  }
  input = malloc((size_t) size);
  if (!input || fread(input, 1, (size_t) size, file) != (size_t) size) {
    fprintf(stderr, "could not read input\n");
    return 3;
  }
  fclose(file);

  optimize = (int) strtol(argv[2], NULL, 10);
  careful = (int) strtol(argv[3], NULL, 10);
  colors = (int) strtol(argv[4], NULL, 10);
  lossy = (int) strtol(argv[5], NULL, 10);
  gamma_type = (int) strtol(argv[6], NULL, 10);
  gamma = strtod(argv[7], NULL);
  status = gifsicle_optimize(input, (uint32_t) size, optimize, careful,
                             colors, lossy, gamma_type, gamma);
  free(input);
  if (status) {
    fprintf(stderr, "%s\n", gifsicle_error_message());
    gifsicle_reset();
    return status;
  }

  file = fopen(argv[8], "wb");
  if (!file || fwrite(gifsicle_output_data(), 1, gifsicle_output_size(), file)
                 != gifsicle_output_size()
      || fclose(file)) {
    fprintf(stderr, "could not write output\n");
    gifsicle_reset();
    return 3;
  }
  gifsicle_reset();
  return 0;
}
