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

#include <cstddef>
#include <cstdint>
#include <string>

#include "guetzli/processor.h"
#include "guetzli/quality.h"
#include "guetzli/stats.h"

namespace {

std::string output;

}  // namespace

extern "C" {

int guetzli_encode(const std::uint8_t* input,
                   std::size_t input_size,
                   int quality) {
  output.clear();
  if (input == nullptr || input_size == 0 || quality < 84 || quality > 110) {
    return 1;
  }

  const std::string input_data(reinterpret_cast<const char*>(input),
                               input_size);
  guetzli::Params parameters;
  parameters.butteraugli_target = static_cast<float>(
      guetzli::ButteraugliScoreForQuality(quality));
  guetzli::ProcessStats statistics;
  if (!guetzli::Process(parameters, &statistics, input_data, &output)) {
    output.clear();
    return 1;
  }
  return 0;
}

const std::uint8_t* guetzli_output_data() {
  return reinterpret_cast<const std::uint8_t*>(output.data());
}

std::size_t guetzli_output_size() {
  return output.size();
}

}  // extern "C"
