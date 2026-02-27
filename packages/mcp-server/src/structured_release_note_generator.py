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
                        "content": """You are a senior software architect analyzing code changes for release notes. 
Your task is to:
1. Identify method-level changes (added, deleted, updated methods with their parameters)
2. Identify class-level changes (added, deleted, updated classes with their properties)
3. Mark deletions as breaking changes
4. Generate concise technical and business titles and descriptions

Be precise and focus on WHAT changed, not HOW it was implemented."""
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
        """Build comprehensive analysis prompt"""
        
        lang_instruction = ""
        if language == "tr":
            lang_instruction = "\n\n**IMPORTANT**: Generate all titles and descriptions in TURKISH language."
        
        pr_summary = "\n".join([
            f"- PR #{pr.pull_request_id}: {pr.title}"
            for pr in pull_requests[:5]
        ])
        
        diff_summary = "\n\n".join([
            f"File: {d['file']}\n```\n{d['diff']}\n```"
            for d in diffs
        ])
        
        return f"""Analyze these code changes and generate a structured release note.{lang_instruction}

**Work Item**: {pbi.title}
**Type**: {pbi.work_item_type}

**Pull Requests**:
{pr_summary}

**Code Changes**:
{diff_summary}

Return ONLY a JSON object with this EXACT structure (no additional text):

{{
  "releaseNote": {{
    "technical": {{
      "title": "Brief technical title (5-10 words)",
      "description": "Technical description focusing on implementation details, architecture, and code changes (2-3 sentences)"
    }},
    "business": {{
      "title": "Brief business-focused title (5-10 words)",
      "description": "Business description focusing on user impact, features, and value (2-3 sentences)"
    }}
  }},
  "changes": {{
    "methods": {{
      "added": [
        {{
          "name": "methodName",
          "class_name": "ClassName",
          "parameters": ["param1: Type", "param2: Type"],
          "description": "Brief description"
        }}
      ],
      "deleted": [
        {{
          "name": "methodName",
          "class_name": "ClassName",
          "parameters": ["param1: Type"],
          "description": "Brief description"
        }}
      ],
      "updated": [
        {{
          "name": "methodName",
          "class_name": "ClassName",
          "parameters": ["newParam: Type"],
          "description": "What was updated"
        }}
      ]
    }},
    "classes": {{
      "added": [
        {{
          "name": "ClassName",
          "properties": ["property1: Type", "property2: Type"],
          "description": "Brief description"
        }}
      ],
      "deleted": [
        {{
          "name": "ClassName",
          "properties": ["property1: Type"],
          "description": "Brief description"
        }}
      ],
      "updated": [
        {{
          "name": "ClassName",
          "properties": ["addedProperty: Type"],
          "description": "What changed"
        }}
      ]
    }}
  }}
}}

Important:
- If no methods/classes changed in a category, use empty array []
- Deletions are automatically breaking changes
- Focus on public APIs and significant changes
- Be concise and precise
- Parameter updates should show NEW parameter list
- Property updates should show ADDED/MODIFIED properties only"""

    def _format_output(self, llm_result: Dict[str, Any]) -> Dict[str, Any]:
        """Format LLM output to match expected structure"""
        
        # Ensure proper structure
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
                "methods": {
                    "added": llm_result.get("changes", {}).get("methods", {}).get("added", []),
                    "deleted": llm_result.get("changes", {}).get("methods", {}).get("deleted", []),
                    "updated": llm_result.get("changes", {}).get("methods", {}).get("updated", [])
                },
                "classes": {
                    "added": llm_result.get("changes", {}).get("classes", {}).get("added", []),
                    "deleted": llm_result.get("changes", {}).get("classes", {}).get("deleted", []),
                    "updated": llm_result.get("changes", {}).get("classes", {}).get("updated", [])
                }
            }
        }
        
        # Add breaking changes flag if there are deletions
        has_breaking_changes = (
            len(output["changes"]["methods"]["deleted"]) > 0 or
            len(output["changes"]["classes"]["deleted"]) > 0
        )
        
        if has_breaking_changes:
            output["breakingChanges"] = True
            output["breakingChangesList"] = (
                output["changes"]["methods"]["deleted"] + 
                output["changes"]["classes"]["deleted"]
            )
        
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
                    "methods": {"added": [], "deleted": [], "updated": []},
                    "classes": {"added": [], "deleted": [], "updated": []}
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
                "methods": {
                    "added": [],
                    "deleted": [],
                    "updated": []
                },
                "classes": {
                    "added": [],
                    "deleted": [],
                    "updated": []
                }
            },
            "note": "Configure OPENAI_API_KEY or AZURE_OPENAI_ENDPOINT for detailed code analysis"
        }
