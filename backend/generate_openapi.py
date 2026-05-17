#!/usr/bin/env python3
"""
Generate OpenAPI 3.1.0 specification from FastAPI codebase.
Outputs:
  - docs/openapi.json
  - docs/API.md
  - frontend/generated/api-types.ts
"""

import json
import os
from datetime import datetime
from pathlib import Path

# FastAPI introspection
from app.main import app

def generate_openapi_spec():
    """Extract and save OpenAPI spec."""
    spec = app.openapi()

    # Ensure output directory exists
    docs_dir = Path("docs")
    docs_dir.mkdir(exist_ok=True)

    # Save OpenAPI JSON
    openapi_path = docs_dir / "openapi.json"
    with open(openapi_path, "w") as f:
        json.dump(spec, f, indent=2)
    print(f"[OK] OpenAPI spec saved to {openapi_path}")

    return spec

def generate_markdown_docs(spec):
    """Generate human-readable API documentation."""
    docs_dir = Path("docs")
    md_path = docs_dir / "API.md"

    lines = [
        "# AI Healthcare API Reference",
        "",
        f"**Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
        f"**Version:** {spec.get('info', {}).get('version', '1.0.0')}",
        "",
        "## Overview",
        "",
        spec.get('info', {}).get('description', 'Healthcare diagnosis and management API'),
        "",
        "---",
        "",
        "## Authentication",
        "",
        "All endpoints (except `/auth/register` and `/auth/login`) require JWT authentication via httpOnly cookie (`auth_token`) or Authorization header.",
        "",
        "**Authorization Header:**",
        "```",
        "Authorization: Bearer <access_token>",
        "```",
        "",
        "---",
        "",
        "## Endpoints by Category",
        "",
    ]

    # Group endpoints by tag
    paths = spec.get('paths', {})
    tags = {}

    for path, methods in paths.items():
        for method, details in methods.items():
            if method.startswith('x-'):
                continue
            tag = details.get('tags', ['uncategorized'])[0]
            if tag not in tags:
                tags[tag] = []
            tags[tag].append({
                'path': path,
                'method': method.upper(),
                'summary': details.get('summary', ''),
                'description': details.get('description', ''),
                'parameters': details.get('parameters', []),
                'requestBody': details.get('requestBody'),
                'responses': details.get('responses', {}),
            })

    # Generate markdown per tag
    for tag in sorted(tags.keys()):
        lines.append(f"### {tag.title()}")
        lines.append("")

        for endpoint in tags[tag]:
            lines.append(f"#### {endpoint['method']} {endpoint['path']}")
            lines.append("")

            if endpoint['summary']:
                lines.append(f"**Summary:** {endpoint['summary']}")
                lines.append("")

            if endpoint['description']:
                lines.append(f"**Description:** {endpoint['description']}")
                lines.append("")

            # Parameters
            if endpoint['parameters']:
                lines.append("**Parameters:**")
                lines.append("")
                for param in endpoint['parameters']:
                    param_name = param.get('name', '')
                    param_in = param.get('in', 'query')
                    required = param.get('required', False)
                    param_type = param.get('schema', {}).get('type', 'string')
                    desc = param.get('description', '')
                    req_marker = " *required" if required else ""
                    lines.append(f"- `{param_name}` ({param_in}, {param_type}){req_marker}: {desc}")
                lines.append("")

            # Request body
            if endpoint['requestBody']:
                lines.append("**Request Body:**")
                lines.append("")
                content = endpoint['requestBody'].get('content', {})
                if 'application/json' in content:
                    schema_ref = content['application/json'].get('schema', {})
                    if '$ref' in schema_ref:
                        schema_name = schema_ref['$ref'].split('/')[-1]
                        lines.append(f"```json")
                        lines.append(f"// See schema: {schema_name}")
                        lines.append(f"```")
                lines.append("")

            # Responses
            if endpoint['responses']:
                lines.append("**Responses:**")
                lines.append("")
                for status, resp_details in endpoint['responses'].items():
                    lines.append(f"- **{status}**: {resp_details.get('description', '')}")
                lines.append("")

            lines.append("")

    # Schemas
    lines.extend([
        "---",
        "",
        "## Data Schemas",
        "",
    ])

    components = spec.get('components', {})
    schemas = components.get('schemas', {})

    for schema_name in sorted(schemas.keys()):
        schema = schemas[schema_name]
        lines.append(f"### {schema_name}")
        lines.append("")

        properties = schema.get('properties', {})
        if properties:
            lines.append("| Property | Type | Required | Description |")
            lines.append("|----------|------|----------|-------------|")

            required = schema.get('required', [])
            for prop_name, prop_schema in properties.items():
                prop_type = prop_schema.get('type', 'object')
                is_required = "Yes" if prop_name in required else "No"
                description = prop_schema.get('description', '')
                lines.append(f"| `{prop_name}` | {prop_type} | {is_required} | {description} |")

        lines.append("")

    # Security info
    lines.extend([
        "---",
        "",
        "## Security",
        "",
        "- **Authentication:** JWT via httpOnly cookie (httpOnly, SameSite=Lax, Secure in production)",
        "- **Roles:** PATIENT, DOCTOR, ADMIN",
        "- **HTTPS:** Required in production",
        "- **CORS:** Restricted to configured origins",
        "- **Rate Limiting:** Auth endpoints rate-limited",
        "",
    ])

    with open(md_path, "w") as f:
        f.write("\n".join(lines))

    print(f"[OK] Markdown docs saved to {md_path}")

def generate_typescript_types(spec):
    """Generate TypeScript types from OpenAPI schemas."""

    frontend_dir = Path("../frontend/generated")
    frontend_dir.mkdir(exist_ok=True, parents=True)

    ts_content = [
        "/**",
        " * Auto-generated TypeScript types from OpenAPI spec",
        f" * Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
        " */",
        "",
        "export interface ApiResponse<T = any> {",
        "  success: boolean;",
        "  data: T | null;",
        "  error: { message: string; status_code: number } | null;",
        "  timestamp: string;",
        "}",
        "",
    ]

    components = spec.get('components', {})
    schemas = components.get('schemas', {})

    # Generate interfaces for each schema
    for schema_name in sorted(schemas.keys()):
        schema = schemas[schema_name]
        properties = schema.get('properties', {})

        ts_content.append(f"export interface {schema_name} {{")

        for prop_name, prop_schema in properties.items():
            prop_type = _get_ts_type(prop_schema)
            required = prop_name not in schema.get('required', [])
            optional_marker = "?" if required else ""
            ts_content.append(f"  {prop_name}{optional_marker}: {prop_type};")

        ts_content.append("}")
        ts_content.append("")

    # API client class
    ts_content.extend([
        "export class ApiClient {",
        "  private baseUrl: string;",
        "",
        "  constructor(baseUrl: string = '/api/v1') {",
        "    this.baseUrl = baseUrl;",
        "  }",
        "",
        "  private async request<T>(",
        "    method: string,",
        "    path: string,",
        "    body?: any,",
        "  ): Promise<ApiResponse<T>> {",
        "    const response = await fetch(`${this.baseUrl}${path}`, {",
        "      method,",
        "      headers: { 'Content-Type': 'application/json' },",
        "      body: body ? JSON.stringify(body) : undefined,",
        "      credentials: 'include',",
        "    });",
        "",
        "    if (!response.ok) {",
        "      throw new Error(`API error: ${response.status}`);",
        "    }",
        "",
        "    return response.json();",
        "  }",
        "",
        "  // Auth endpoints",
        "  async register(email: string, password: string, role: string = 'PATIENT'): Promise<ApiResponse<UserOut>> {",
        "    return this.request('POST', '/auth/register', { email, password, role });",
        "  }",
        "",
        "  async login(email: string, password: string): Promise<ApiResponse<Token>> {",
        "    return this.request('POST', '/auth/login', { username: email, password });",
        "  }",
        "",
        "  async getCurrentUser(): Promise<ApiResponse<UserOut>> {",
        "    return this.request('GET', '/auth/me');",
        "  }",
        "",
        "  // Diagnosis endpoints",
        "  async analyzeSymptoms(symptoms: string[], saveRecord: boolean = false): Promise<ApiResponse<PredictionResponse>> {",
        "    return this.request('POST', '/diagnosis/symptoms', { symptoms, save_record: saveRecord });",
        "  }",
        "",
        "  async diagnosisChat(message: string, selectedSymptoms: string[] = [], askedSymptoms: string[] = []): Promise<ApiResponse<DiagnosisChatResponse>> {",
        "    return this.request('POST', '/diagnosis/chat', { message, selected_symptoms: selectedSymptoms, asked_symptoms: askedSymptoms });",
        "  }",
        "",
        "}",
    ])

    ts_path = frontend_dir / "api-types.ts"
    with open(ts_path, "w") as f:
        f.write("\n".join(ts_content))

    print(f"[OK] TypeScript types saved to {ts_path}")

def _get_ts_type(prop_schema):
    """Map OpenAPI type to TypeScript type."""
    prop_type = prop_schema.get('type', 'any')

    type_map = {
        'string': 'string',
        'integer': 'number',
        'number': 'number',
        'boolean': 'boolean',
        'array': 'any[]',
        'object': 'any',
    }

    if prop_type == 'array':
        items = prop_schema.get('items', {})
        item_type = _get_ts_type(items)
        return f"{item_type}[]"

    return type_map.get(prop_type, 'any')

def create_rest_client_file():
    """Generate .http file for REST client testing."""
    docs_dir = Path("docs")
    http_path = docs_dir / "health-check.http"

    content = """### Health check
GET http://localhost:8000/api/v1/health

### Register user
POST http://localhost:8000/api/v1/auth/register
Content-Type: application/json

{
  "email": "patient@example.com",
  "password": "SecurePass123!",
  "role": "PATIENT"
}

### Login
POST http://localhost:8000/api/v1/auth/login
Content-Type: application/x-www-form-urlencoded

username=patient@example.com&password=SecurePass123!

### Get current user
GET http://localhost:8000/api/v1/auth/me
Authorization: Bearer <access_token>

### Analyze symptoms
POST http://localhost:8000/api/v1/diagnosis/symptoms
Content-Type: application/json
Authorization: Bearer <access_token>

{
  "symptoms": ["fever", "cough"],
  "save_record": true
}

### Get medical records
GET http://localhost:8000/api/v1/records
Authorization: Bearer <access_token>
"""

    with open(http_path, "w") as f:
        f.write(content)

    print(f"[OK] REST client file saved to {http_path}")

if __name__ == "__main__":
    spec = generate_openapi_spec()
    generate_markdown_docs(spec)
    generate_typescript_types(spec)
    create_rest_client_file()

    print("\n[OK] API documentation generation complete!")
    print("\nFiles created:")
    print("  - docs/openapi.json (OpenAPI 3.1.0 spec)")
    print("  - docs/API.md (Human-readable reference)")
    print("  - ../frontend/generated/api-types.ts (TypeScript types)")
    print("  - docs/health-check.http (REST client file)")
