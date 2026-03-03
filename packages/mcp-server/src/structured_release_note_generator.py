"""Structured release note generator with detailed method and class change tracking"""

import os
import json
from typing import List, Dict, Any, Optional
from openai import OpenAI, AzureOpenAI
from .models import (
    PullRequest, 
    WorkItem, 
    FileChange,
    ReleaseNoteOutput, 
    ReleaseNoteSection,
    MethodChange,
    ClassChange,
    ChangeDetails
)


class StructuredReleaseNoteGenerator:
    """Generates structured release notes with detailed code change analysis"""

    def __init__(self):
        """Initialize OpenAI or Azure OpenAI client"""
        
        azure_endpoint = os.getenv("AZURE_OPENAI_ENDPOINT")
        openai_key = os.getenv("OPENAI_API_KEY")
        
        if azure_endpoint:
            self.client = AzureOpenAI(
                api_key=os.getenv("AZURE_OPENAI_API_KEY"),
                api_version=os.getenv("AZURE_OPENAI_API_VERSION", "2024-02-15-preview"),
                azure_endpoint=azure_endpoint,
                default_headers={"api-key": os.getenv("AZURE_OPENAI_API_KEY")}
            )
            self.model = os.getenv("AZURE_OPENAI_DEPLOYMENT", "gpt-4")
            self.llm_enabled = True
        elif openai_key:
            self.client = OpenAI(api_key=openai_key)
            self.model = os.getenv("OPENAI_MODEL", "gpt-4o")
            self.llm_enabled = True
        else:
            self.llm_enabled = False
            print("⚠️ LLM not configured for structured release notes")

    async def generate_structured_release_notes(
        self,
        pbi: WorkItem,
        pull_requests: List[PullRequest],
        diffs: Dict[str, Dict[str, str]],  # pr_id -> {file_path -> diff}
        file_changes: List[FileChange],
        language: str = "en"
    ) -> Dict[str, Any]:
        """Generate structured release notes with method/class analysis
        
        Args:
            pbi: Work item
            pull_requests: List of pull requests
            diffs: Dictionary of diffs per PR
            file_changes: List of file changes
            language: Language for release notes (en or tr)
            
        Returns:
            Structured release note as dictionary
        """
        
        if not self.llm_enabled:
            return self._generate_fallback_notes(pbi, pull_requests, language)
        
        # Combine all diffs for analysis
        all_diffs = []
        for pr_diffs in diffs.values():
            for file_path, diff_content in pr_diffs.items():
                all_diffs.append({
                    "file": file_path,
                    "diff": diff_content[:2000]  # Limit diff size
                })
        
        # Build comprehensive analysis prompt
        prompt = self._build_analysis_prompt(pbi, pull_requests, all_diffs[:10], language)  # Limit to 10 files
        
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system", 
                        "content": """You are a senior software architect performing structured diff analysis on code changes.

For EACH changed file, determine its type and extract ONLY structural changes — not narrative descriptions:

1. UI FILE (.tsx, .jsx, .vue, .svelte, frontend component/page/form files):
   → Extract added/deleted/updated FIELDS (form inputs, table columns, display fields)
   → For each field: name, type (text/number/date/select/checkbox/…), label, required, and any other visible properties

2. API FILE (.routes.ts, .controller.ts, .py route/endpoint files, Express/FastAPI/NestJS handlers):
   → Extract added/deleted/updated ENDPOINTS
   → For each endpoint: HTTP method, path, request model fields, response model fields
   → For updated endpoints: show what changed in request/response models specifically

3. TABLE/ENTITY FILE (.prisma, migration SQL, *.entity.ts, *.model.ts, schema files):
   → Extract added/deleted/updated COLUMNS
   → For each column: table name, column name, data type, nullable, default value, unique

Produce ONLY the JSON. No narrative text. No explanations outside JSON."""
                    },
                    {"role": "user", "content": prompt}
                ],
                temperature=0.2,
                max_tokens=2000,
                response_format={"type": "json_object"}
            )
            
            result = json.loads(response.choices[0].message.content)
            return self._format_output(result)
            
        except Exception as e:
            print(f"Error generating structured release notes: {e}")
            return self._generate_fallback_notes(pbi, pull_requests)

    def _build_analysis_prompt(
        self, 
        pbi: WorkItem, 
        pull_requests: List[PullRequest],
        diffs: List[Dict[str, str]],
        language: str = "en"
    ) -> str:
        """Build structured diff analysis prompt — UI / API / Table separation"""
        
        lang_instruction = ""
        if language == "tr":
            lang_instruction = "\n\n**IMPORTANT**: Generate all titles and descriptions in TURKISH language."
        
        pr_summary = "\n".join([
            f"- PR #{pr.pull_request_id}: {pr.title}"
            for pr in pull_requests[:5]
        ])
        
        diff_summary = "\n\n".join([
            f"### File: {d['file']}\n```\n{d['diff']}\n```"
            for d in diffs
        ])
        
        return f"""Analyze the code diffs below and produce a structured change report.{lang_instruction}

**Work Item**: {pbi.title}
**Type**: {pbi.work_item_type}

**Pull Requests**:
{pr_summary}

**Code Changes** (file diffs):
{diff_summary}

---

File type classification rules (apply to every diff above):
- UI file: extension is .tsx / .jsx / .vue / .svelte, OR path contains /pages/ /components/ /screens/ /views/
- API file: extension is .routes.ts / .controller.ts / .py, OR path contains /routes/ /controllers/ /endpoints/
- TABLE file: extension is .prisma / .sql, OR filename contains entity / model / schema (e.g. *.entity.ts)

Return ONLY the following JSON. Use empty arrays [] where nothing changed. No text outside JSON.

{{
  "releaseNote": {{
    "technical": {{
      "title": "Brief technical title (5-10 words)",
      "description": "Technical description: which layers changed, what was restructured (2-3 sentences)"
    }},
    "business": {{
      "title": "Brief business-focused title (5-10 words)",
      "description": "Business impact: what users/operators can now do differently (2-3 sentences)"
    }}
  }},
  "changes": {{
    "ui": {{
      "added": [
        {{
          "file": "relative/path/to/File.tsx",
          "field": "fieldName",
          "type": "text | number | date | select | checkbox | table-column | display | …",
          "label": "Visible label text",
          "required": true,
          "properties": {{"placeholder": "…", "options": ["…"]}}
        }}
      ],
      "deleted": [
        {{
          "file": "relative/path/to/File.tsx",
          "field": "fieldName",
          "type": "text",
          "label": "Label"
        }}
      ],
      "updated": [
        {{
          "file": "relative/path/to/File.tsx",
          "field": "fieldName",
          "changes": {{"type": "text→select", "label": "Old Label→New Label", "required": "false→true"}}
        }}
      ]
    }},
    "api": {{
      "added": [
        {{
          "file": "relative/path/to/file.routes.ts",
          "httpMethod": "POST",
          "path": "/api/resource",
          "requestModel": {{"field1": "string", "field2": "number?"}},
          "responseModel": {{"id": "string", "createdAt": "Date"}}
        }}
      ],
      "deleted": [
        {{
          "file": "relative/path/to/file.routes.ts",
          "httpMethod": "DELETE",
          "path": "/api/resource/:id",
          "requestModel": {{}},
          "responseModel": {{}}
        }}
      ],
      "updated": [
        {{
          "file": "relative/path/to/file.routes.ts",
          "httpMethod": "GET",
          "path": "/api/resource",
          "requestModelChanges": {{"added": {{"status": "string?"}}, "removed": {{"legacyField": "string"}}}},
          "responseModelChanges": {{"added": {{"count": "number"}}, "removed": {{}}}}
        }}
      ]
    }},
    "table": {{
      "added": [
        {{
          "file": "relative/path/to/schema.prisma",
          "table": "table_name",
          "column": "column_name",
          "dataType": "String",
          "nullable": true,
          "default": null,
          "unique": false
        }}
      ],
      "deleted": [
        {{
          "file": "relative/path/to/schema.prisma",
          "table": "table_name",
          "column": "column_name",
          "dataType": "String"
        }}
      ],
      "updated": [
        {{
          "file": "relative/path/to/schema.prisma",
          "table": "table_name",
          "column": "column_name",
          "changes": {{"dataType": "String→Text", "nullable": "false→true"}}
        }}
      ]
    }}
  }}
}}

Rules:
- Extract only structurally observable changes from the diff (added/removed lines).
- For UI: a "field" is any <input>, <Select>, <TextField>, <DatePicker>, table column header, or form control.
- For API: only include endpoints that have a route handler (router.get/post/put/delete or @Get/@Post etc.).
- For TABLE: read Prisma model fields or SQL ALTER TABLE / CREATE TABLE statements directly.
- Do NOT invent fields. If a diff is for a file type that doesn't match any category, skip it.
- For updated items, only describe what CHANGED between old and new lines — not the whole structure.
- Deletions in api/table are automatically breaking changes."""

    def _format_output(self, llm_result: Dict[str, Any]) -> Dict[str, Any]:
        """Format LLM output: ui / api / table structured changes"""
        
        def _pt(items: Any) -> list:
            """Pass through list, default to []"""
            return items if isinstance(items, list) else []
        
        raw_changes = llm_result.get("changes", {})
        
        ui_changes = raw_changes.get("ui", {})
        api_changes = raw_changes.get("api", {})
        table_changes = raw_changes.get("table", {})
        
        output = {
            "releaseNote": {
                "technical": {
                    "title": llm_result.get("releaseNote", {}).get("technical", {}).get("title", "Technical Updates"),
                    "description": llm_result.get("releaseNote", {}).get("technical", {}).get("description", "Code improvements applied")
                },
                "business": {
                    "title": llm_result.get("releaseNote", {}).get("business", {}).get("title", "Feature Updates"),
                    "description": llm_result.get("releaseNote", {}).get("business", {}).get("description", "System improvements delivered")
                }
            },
            "changes": {
                "ui": {
                    "added":   _pt(ui_changes.get("added", [])),
                    "deleted": _pt(ui_changes.get("deleted", [])),
                    "updated": _pt(ui_changes.get("updated", []))
                },
                "api": {
                    "added":   _pt(api_changes.get("added", [])),
                    "deleted": _pt(api_changes.get("deleted", [])),
                    "updated": _pt(api_changes.get("updated", []))
                },
                "table": {
                    "added":   _pt(table_changes.get("added", [])),
                    "deleted": _pt(table_changes.get("deleted", [])),
                    "updated": _pt(table_changes.get("updated", []))
                }
            }
        }
        
        # Breaking changes = deleted api endpoints OR deleted table columns
        breaking_items = (
            output["changes"]["api"]["deleted"] +
            output["changes"]["table"]["deleted"]
        )
        
        if breaking_items:
            output["breakingChanges"] = True
            output["breakingChangesList"] = breaking_items
        
        return output

    def _generate_fallback_notes(
        self, 
        pbi: WorkItem, 
        pull_requests: List[PullRequest],
        language: str = "en"
    ) -> Dict[str, Any]:
        """Generate fallback notes when LLM is not available"""
        
        if language == "tr":
            return {
                "releaseNote": {
                    "technical": {
                        "title": f"{pbi.work_item_type}: {pbi.title[:50]}",
                        "description": f"Kod değişiklikleri {len(pull_requests)} pull request üzerinden uygulandı. LLM analizi mevcut değil - detaylı analiz için OpenAI/Azure OpenAI yapılandırın."
                    },
                    "business": {
                        "title": f"Güncellemeler: {pbi.title[:50]}",
                        "description": f"Iş öğesi {len(pull_requests)} kod değişikliği ile tamamlandı. Detaylı etki analizi için LLM yapılandırması gerekli."
                    }
                },
                "changes": {
                    "ui":    {"added": [], "deleted": [], "updated": []},
                    "api":   {"added": [], "deleted": [], "updated": []},
                    "table": {"added": [], "deleted": [], "updated": []}
                },
                "note": "Detaylı kod analizi için OPENAI_API_KEY veya AZURE_OPENAI_ENDPOINT yapılandırın"
            }
        
        return {
            "releaseNote": {
                "technical": {
                    "title": f"{pbi.work_item_type}: {pbi.title[:50]}",
                    "description": f"Code changes applied across {len(pull_requests)} pull request(s). LLM analysis not available - configure OpenAI/Azure OpenAI for detailed analysis."
                },
                "business": {
                    "title": f"Updates: {pbi.title[:50]}",
                    "description": f"Work item completed with {len(pull_requests)} code change(s). Detailed impact analysis requires LLM configuration."
                }
            },
            "changes": {
                "ui":    {"added": [], "deleted": [], "updated": []},
                "api":   {"added": [], "deleted": [], "updated": []},
                "table": {"added": [], "deleted": [], "updated": []}
            },
            "note": "Configure OPENAI_API_KEY or AZURE_OPENAI_ENDPOINT for detailed code analysis"
        }
