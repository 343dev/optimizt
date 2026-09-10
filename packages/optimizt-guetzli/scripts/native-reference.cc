/*
 * Copyright 2026 343dev
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

#include <cctype>
#include <fstream>
#include <iostream>
#include <iterator>
#include <stdexcept>
#include <string>

#include "guetzli/processor.h"
#include "guetzli/quality.h"
#include "guetzli/stats.h"

int main(int argc, char** argv) {
  if (argc != 4) {
    std::cerr << "Usage: native-reference QUALITY INPUT OUTPUT\n";
    return 2;
  }

  const char* quality_text = argv[1];
  bool digits_only = *quality_text != '\0';
  for (const char* character = quality_text;
       digits_only && *character != '\0'; ++character) {
    digits_only =
        std::isdigit(static_cast<unsigned char>(*character)) != 0;
  }
  if (!digits_only) {
    std::cerr << "QUALITY must be an integer\n";
    return 2;
  }

  int quality;
  try {
    quality = std::stoi(quality_text);
  } catch (const std::exception&) {
    std::cerr << "QUALITY must be an integer\n";
    return 2;
  }
  if (quality < 84 || quality > 110) {
    std::cerr << "QUALITY must be between 84 and 110\n";
    return 2;
  }

  std::ifstream input_file(argv[2], std::ios::binary);
  if (!input_file) {
    std::cerr << "Could not open input\n";
    return 3;
  }
  const std::string input((std::istreambuf_iterator<char>(input_file)),
                          std::istreambuf_iterator<char>());
  if (input_file.bad()) {
    std::cerr << "Could not read input\n";
    return 3;
  }

  guetzli::Params params;
  params.butteraugli_target = static_cast<float>(
      guetzli::ButteraugliScoreForQuality(quality));
  guetzli::ProcessStats stats;
  std::string output;
  if (!guetzli::Process(params, &stats, input, &output)) {
    std::cerr << "Guetzli processing failed\n";
    return 1;
  }

  std::ofstream output_file(argv[3], std::ios::binary | std::ios::trunc);
  if (!output_file) {
    std::cerr << "Could not open output\n";
    return 3;
  }
  output_file.write(output.data(), output.size());
  if (!output_file) {
    std::cerr << "Could not write output\n";
    return 3;
  }
  return 0;
}
