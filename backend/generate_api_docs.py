#!/usr/bin/env python3
"""
Generate comprehensive API documentation from FastAPI app.
Outputs: openapi.json, API.md, api-types.ts
"""

import json
import sys
import os
from pathlib import Path
from typing import Dict, List, Any, Optional

# Add app to path
sys.path.insert(0, str(Path(__file__).parent))

from app.main import app


def generate_openapi_spec() -> Dict[str, Any]:
    """Extract OpenAPI spec from FastAPI app."""
    return app.openapi()


def generate_markdown_docs(spec: Dict[str, Any]) -> str:
    """Convert OpenAPI spec to human-readable Markdown."""
    md = []
    md.append("# AI Healthcare API Reference\n")
    md.append(f"**Version:** {spec.get('info', {}).get('version', '1.0.0')}\n")
    md.append(f"**Base URL:** `/api/v1`\n\n")

    # Authentication section
    md.append("## Authentication\n")
    md.append("- **Type:** OAuth2 with httpOnly cookies\n")
    md.append("- **Cookie Name:** `Authorization`\n")
    md.append("- **Endpoints:**\n")
    md.append("  - `POST /auth/register` - Create new account\n")
    md.append("  - `POST /auth/login` - Get access token\n")
    md.append("  - `POST /auth/change-password` - Change password (protected)\n\n")

    # Iterate through paths
    paths = spec.get('paths', {})

    # Group by tag
    tagged_paths: Dict[str, List[tuple]] = {}
    for path, methods in sorted(paths.items()):
        for method, details in methods.items():
            if method == "parameters":
                continue
            tag = details.get('tags', ['uncategorized'])[0]
            if tag not in tagged_paths:
                tagged_paths[tag] = []
            tagged_paths[tag].append((path, method.upper(), details))

    for tag in sorted(tagged_paths.keys()):
        md.append(f"## {tag.title()}\n\n")

        for path, method, details in sorted(tagged_paths[tag]):
            summary = details.get('summary', 'No description')
            operation_id = details.get('operationId', '')

            # Method badge
            method_badges = {
                'GET': '🟦',
                'POST': '🟩',
                'PUT': '🟪',
                'PATCH': '🟨',
                'DELETE': '🟥',
            }
            badge = method_badges.get(method, '⚪')

            md.append(f"### {badge} {method} {path}\n")
            md.append(f"{summary}\n\n")

            # Request body
            if 'requestBody' in details:
                req = details['requestBody']
                md.append("**Request Body:**\n")
                if 'application/json' in req.get('content', {}):
                    schema_ref = req['content']['application/json'].get('schema', {}).get('$ref', '')
                    if schema_ref:
                        schema_name = schema_ref.split('/')[-1]
                        md.append(f"```json\n{schema_name}\n```\n\n")

            # Parameters
            if 'parameters' in details:
                md.append("**Parameters:**\n\n")
                md.append("| Name | In | Type | Required | Description |\n")
                md.append("|------|----|----|----------|-------------|\n")
                for param in details['parameters']:
                    name = param.get('name', '')
                    in_loc = param.get('in', '')
                    param_type = param.get('schema', {}).get('type', 'object')
                    required = '✓' if param.get('required', False) else ''
                    desc = param.get('description', '')
                    md.append(f"| {name} | {in_loc} | {param_type} | {required} | {desc} |\n")
                md.append("\n")

            # Responses
            if 'responses' in details:
                md.append("**Responses:**\n\n")
                for status, resp in details['responses'].items():
                    desc = resp.get('description', '')
                    md.append(f"- **{status}:** {desc}\n")
                md.append("\n")

            md.append("---\n\n")

    return "".join(md)


def generate_typescript_types(spec: Dict[str, Any]) -> str:
    """Generate TypeScript types from OpenAPI schemas."""
    ts = []
    ts.append("// Auto-generated TypeScript types from OpenAPI spec\n\n")

    # Components/schemas
    schemas = spec.get('components', {}).get('schemas', {})

    for schema_name, schema in sorted(schemas.items()):
        ts.append(f"export interface {schema_name} {{\n")

        properties = schema.get('properties', {})
        required = schema.get('required', [])

        for prop_name, prop_schema in sorted(properties.items()):
            optional = '?' if prop_name not in required else ''
            ts_type = map_json_schema_to_ts(prop_schema)
            description = prop_schema.get('description', '')

            if description:
                ts.append(f"  /** {description} */\n")

            ts.append(f"  {prop_name}{optional}: {ts_type};\n")

        ts.append("}\n\n")

    return "".join(ts)


def map_json_schema_to_ts(schema: Dict[str, Any]) -> str:
    """Map JSON schema type to TypeScript type."""
    schema_type = schema.get('type', 'any')

    type_map = {
        'string': 'string',
        'number': 'number',
        'integer': 'number',
        'boolean': 'boolean',
        'array': 'any[]',
        'object': 'Record<string, any>',
    }

    if 'enum' in schema:
        return f"'{\"' | '\".join(schema['enum'])}'"

    if schema_type == 'array':
        items_type = map_json_schema_to_ts(schema.get('items', {}))
        return f"{items_type}[]"

    if '$ref' in schema:
        return schema['$ref'].split('/')[-1]

    return type_map.get(schema_type, 'any')


def main():
    """Generate all documentation."""
    print("Generating API documentation...")

    # Generate OpenAPI spec
    spec = generate_openapi_spec()

    # Create docs directory
    docs_dir = Path(__file__).parent / "docs"
    docs_dir.mkdir(exist_ok=True)

    # Write openapi.json
    openapi_path = docs_dir / "openapi.json"
    with open(openapi_path, 'w') as f:
        json.dump(spec, f, indent=2)
    print(f"✓ Generated {openapi_path}")

    # Generate and write Markdown
    md_content = generate_markdown_docs(spec)
    md_path = docs_dir / "API.md"
    with open(md_path, 'w') as f:
        f.write(md_content)
    print(f"✓ Generated {md_path}")

    # Generate and write TypeScript types
    ts_content = generate_typescript_types(spec)
    ts_path = Path(__file__).parent.parent / "frontend" / "generated" / "api-types.ts"
    ts_path.parent.mkdir(parents=True, exist_ok=True)
    with open(ts_path, 'w') as f:
        f.write(ts_content)
    print(f"✓ Generated {ts_path}")

    print("\nDocumentation generated successfully!")
    print(f"  - OpenAPI spec: {openapi_path}")
    print(f"  - Markdown docs: {md_path}")
    print(f"  - TypeScript types: {ts_path}")


if __name__ == '__main__':
    main()
