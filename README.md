# OpenRouter Model Explorer CLI

A powerful command-line tool built with Deno to fetch, filter, sort, and display AI models from the OpenRouter API. Easily discover and compare models with support for various output formats and advanced filtering options.

## Features

- **Fast & Cached**: Models are cached locally for 24 hours to minimize API calls
- **Smart Search**: Search by model ID, name, or description
- **Multiple Output Formats**: Table, JSON, CSV, and Markdown (with verbose option)
- **Price Analysis**: View pricing in ¢/M tokens or invert to tokens per dollar
- **Advanced Filtering**: Filter by price, context length, and supported features
- **Flexible Sorting**: Sort by price, context length, creation date, or name
- **Feature Detection**: Identify models supporting reasoning, tools, and structured output

## Installation

### Prerequisites

- [Deno](https://deno.land/) runtime (v1.0 or higher)

### Quick Start

#### Option 1: Run directly from JSR (Recommended)

```bash
deno run -A jsr:@fry69/or-models --help
```

#### Option 2: Clone and run locally

1. Clone this repository:
```bash
git clone https://github.com/fry69/or-models-cli.git
cd or-models-cli
```

2. Make the script executable:
```bash
chmod +x main.ts
```

3. Run the tool:
```bash
./main.ts --help
```

#### Option 3: Direct execution
```bash
deno run --allow-env --allow-net=openrouter.ai --allow-read --allow-write main.ts
```

## Usage

### Basic Examples

```bash
# List all models (default: sorted by creation date, table format)
deno run -A jsr:@fry69/or-models

# Search for specific models
deno run -A jsr:@fry69/or-models "gpt-4"
deno run -A jsr:@fry69/or-models "claude"

# Show only free models
deno run -A jsr:@fry69/or-models --free

# Filter by price range ($/M tokens)
deno run -A jsr:@fry69/or-models --min-prompt-price 0.01 --max-prompt-price 1.0

# Filter by context length
deno run -A jsr:@fry69/or-models --min-context 32000

# Show models with specific capabilities
deno run -A jsr:@fry69/or-models --supports-reasoning
deno run -A jsr:@fry69/or-models --supports-tools
deno run -A jsr:@fry69/or-models --supports-structured-output
```

### Output Formats

```bash
# Table format (default)
deno run -A jsr:@fry69/or-models --output table

# JSON format for programmatic use
deno run -A jsr:@fry69/or-models --output json

# CSV format for spreadsheet import
deno run -A jsr:@fry69/or-models --output csv

# Markdown table
deno run -A jsr:@fry69/or-models --output md

# Markdown with detailed descriptions
deno run -A jsr:@fry69/or-models --output md-verbose
```

### Sorting Options

```bash
# Sort by prompt price (ascending)
deno run -A jsr:@fry69/or-models --sort-by prompt_price

# Sort by completion price (descending)
deno run -A jsr:@fry69/or-models --sort-by completion_price --desc

# Sort by context length
deno run -A jsr:@fry69/or-models --sort-by context

# Sort by name
deno run -A jsr:@fry69/or-models --sort-by name
```

### Advanced Usage

```bash
# Show pricing as tokens per dollar instead of ¢/M
deno run -A jsr:@fry69/or-models --invert-price

# Force refresh the model cache
deno run -A jsr:@fry69/or-models --force-refresh

# Complex filter: Free models with reasoning support, sorted by context
deno run -A jsr:@fry69/or-models --free --supports-reasoning --sort-by context --desc
```

## Command Line Options

### General Options

- `--help, -h` - Show help message
- `--output <format>` - Output format: `table`, `json`, `csv`, `md`, `md-verbose` (default: `table`)
- `--sort-by <field>` - Sort by: `prompt_price`, `completion_price`, `context`, `created`, `name` (default: `created`)
- `--desc` - Sort in descending order
- `--invert-price` - Show price as tokens per dollar instead of dollar per million
- `--force-refresh` - Force fresh download of model list
- `--long` - Output long model names, possibly breaking terminal layout (default: off)

### Filtering Options

- `--free` - Show only free models
- `--min-prompt-price <price>` - Filter by minimum prompt price per token
- `--max-prompt-price <price>` - Filter by maximum prompt price per token
- `--min-context <length>` - Filter by minimum context length
- `--max-context <length>` - Filter by maximum context length
- `--supports-reasoning` - Filter for models that support reasoning
- `--supports-tools` - Filter for models that support tool use
- `--supports-structured-output` - Filter for models that support structured output
- `--supports-response-format` - Filter for models that support response format (JSON mode)

## Output Examples

### Table Format

```
Loading models from cache...
ID | Prompt ($/M) | Compl. ($/M) | Context | Age | Reason | Tools | JSON | Schema
openai/gpt-3.5-turbo                          |   0.50 |   1.50 |     16,385 |  ~2 yrs |    | ✅ | ✅ | ✅
openai/gpt-4                                  |  30.00 |  60.00 |      8,191 |  ~2 yrs |    | ✅ | ✅ | ✅
openai/gpt-4-0314                             |  30.00 |  60.00 |      8,191 |  ~2 yrs |    | ✅ | ✅ | ✅
gryphe/mythomax-l2-13b                        |   0.06 |   0.06 |      4,096 |  ~2 yrs |    |    | ✅ | ✅
```

### JSON Format

```json
[
  {
    "id": "openai/gpt-3.5-turbo-0613",
    "name": "OpenAI: GPT-3.5 Turbo (older v0613)",
    "description": "GPT-3.5 Turbo is OpenAI's fastest model. It can understand and generate natural language or code, and is optimized for chat and traditional completion tasks.\n\nTraining data up to Sep 2021.",
    "context_length": 4095,
    "created": 1706140800,
    "hugging_face_id": null,
    "canonical_slug": "openai/gpt-3.5-turbo-0613",
    "architecture": {
      "modality": "text->text",
      "input_modalities": [
        "text"
      ],
      "output_modalities": [
        "text"
      ],
      "tokenizer": "GPT",
      "instruct_type": null
    },
    "pricing": {
      "prompt": "0.000001",
      "completion": "0.000002",
      "request": "0",
      "image": "0",
      "web_search": "0",
      "internal_reasoning": "0"
    },
    "top_provider": {
      "context_length": 4095,
      "max_completion_tokens": 4096,
      "is_moderated": false
    },
    "per_request_limits": null,
    "supported_parameters": [
      "frequency_penalty",
      "logit_bias",
      "logprobs",
      "max_tokens",
      "presence_penalty",
      "response_format",
      "seed",
      "stop",
      "structured_outputs",
      "temperature",
      "tool_choice",
      "tools",
      "top_logprobs",
      "top_p"
    ]
  }
]
```

## Cache Management

The tool automatically caches model data in `~/.cache/or-model-cli-deno/or-models.json` for 24 hours to improve performance and reduce API calls. Use `--force-refresh` to bypass the cache when needed.

## Development

### Project Structure

- `main.ts` - Main CLI application with all functionality
- `deno.json` - Deno configuration and dependencies
- `deno.lock` - Dependency lock file

### Dependencies

- `@std/cli` - Command-line argument parsing
- `@std/fmt/colors` - Terminal color formatting
- `zod` - Runtime type validation for API responses

### Type Safety

The project uses Zod schemas to validate the OpenRouter API response structure, ensuring type safety and graceful error handling when the API changes.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the [MIT License](LICENSE).

## Acknowledgments

- [OpenRouter](https://openrouter.ai/) for providing the model API
- [Deno](https://deno.land/) for the modern TypeScript runtime
- The open-source community for the excellent libraries used in this project

## API Reference

This tool uses the [OpenRouter API](https://openrouter.ai/docs#models) to fetch model information. No API key is required for read-only access to the models endpoint.
