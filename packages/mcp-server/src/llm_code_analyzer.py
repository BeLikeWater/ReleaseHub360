"""LLM-powered code analyzer using OpenAI/Azure OpenAI"""

import os
from typing import List, Dict, Any, Optional
from openai import OpenAI, AzureOpenAI
from .models import PullRequest, CodeAnalysis, FileChange


class LLMCodeAnalyzer:
    """Analyzes code changes using LLM to generate meaningful insights"""

    def __init__(self):
        """Initialize OpenAI or Azure OpenAI client based on environment variables"""
        
        # Check which provider to use
        azure_endpoint = os.getenv("AZURE_OPENAI_ENDPOINT")
        openai_key = os.getenv("OPENAI_API_KEY")
        
        if azure_endpoint:
            # Use Azure OpenAI
            # Note: For APIM, the endpoint should not include /openai at the end
            # The client will append /deployments/{deployment-name}/chat/completions
            self.client = AzureOpenAI(
                api_key=os.getenv("AZURE_OPENAI_API_KEY"),
                api_version=os.getenv("AZURE_OPENAI_API_VERSION", "2024-02-15-preview"),
                azure_endpoint=azure_endpoint,
                # For APIM, we need custom headers
                default_headers={"api-key": os.getenv("AZURE_OPENAI_API_KEY")}
            )
            self.model = os.getenv("AZURE_OPENAI_DEPLOYMENT", "gpt-4")
            self.provider = "azure"
            print(f"✅ Azure OpenAI initialized: {azure_endpoint}")
        elif openai_key:
            # Use OpenAI
            self.client = OpenAI(api_key=openai_key)
            self.model = os.getenv("OPENAI_MODEL", "gpt-4o")
            self.provider = "openai"
            print(f"✅ OpenAI initialized")
        else:
            raise ValueError(
                "OpenAI configuration required. Set either:\n"
                "  - OPENAI_API_KEY for OpenAI, or\n"
                "  - AZURE_OPENAI_ENDPOINT and AZURE_OPENAI_API_KEY for Azure OpenAI"
            )

    def analyze_code_diff(self, file_path: str, diff_content: str) -> Dict[str, Any]:
        """Analyze a single file diff using LLM
        
        Args:
            file_path: Path to the file
            diff_content: Git diff content
            
        Returns:
            Dictionary with analysis results
        """
        
        prompt = f"""Analyze this code change and provide a concise summary.

File: {file_path}

Diff:
```
{diff_content[:3000]}  
```

Provide a JSON response with:
{{
  "summary": "Brief 1-sentence summary of what changed",
  "details": "2-3 sentence detailed explanation",
  "type": "feature|bugfix|refactor|performance|test|docs|other",
  "impact": "high|medium|low",
  "business_value": "What business value does this provide?"
}}

Keep it concise and focus on WHAT changed, not HOW."""

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a code reviewer analyzing git diffs. Provide concise, business-focused summaries."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                max_tokens=500,
                response_format={"type": "json_object"}
            )
            
            import json
            result = json.loads(response.choices[0].message.content)
            result["file_path"] = file_path
            return result
            
        except Exception as e:
            print(f"Error analyzing diff for {file_path}: {e}")
            return {
                "file_path": file_path,
                "summary": "Code changes applied",
                "details": f"Modified {file_path}",
                "type": "other",
                "impact": "medium",
                "business_value": "Code improvements"
            }

    def analyze_pr_changes(
        self,
        pr: PullRequest,
        file_changes: List[FileChange],
        diffs: Dict[str, str]
    ) -> Dict[str, Any]:
        """Analyze all changes in a PR
        
        Args:
            pr: Pull request object
            file_changes: List of file changes
            diffs: Dictionary mapping file paths to diff content
            
        Returns:
            Aggregated analysis of the PR
        """
        
        analyses = []
        
        # Analyze each file diff
        for file_change in file_changes[:5]:  # Limit to first 5 files to save tokens
            diff = diffs.get(file_change.path, "")
            if diff:
                analysis = self.analyze_code_diff(file_change.path, diff)
                analyses.append(analysis)
        
        # Generate PR-level summary
        if analyses:
            return self._generate_pr_summary(pr, analyses)
        else:
            return {
                "pr_id": pr.pull_request_id,
                "summary": pr.title,
                "changes": [],
                "overall_type": "other",
                "overall_impact": "medium"
            }

    def _generate_pr_summary(
        self,
        pr: PullRequest,
        file_analyses: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Generate overall PR summary from file analyses"""
        
        # Create a concise summary of all changes
        changes_summary = "\n".join([
            f"- {a['file_path'].split('/')[-1]}: {a['summary']}"
            for a in file_analyses
        ])
        
        prompt = f"""Summarize this pull request based on the file changes:

PR Title: {pr.title}

File Changes:
{changes_summary}

Provide a JSON response with:
{{
  "overall_summary": "One sentence describing what this PR accomplishes",
  "key_changes": ["Change 1", "Change 2", "Change 3"],
  "business_impact": "What business value does this PR provide?",
  "technical_highlights": "Any notable technical improvements"
}}

Be concise and business-focused."""

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a technical project manager summarizing code changes for stakeholders."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                max_tokens=400,
                response_format={"type": "json_object"}
            )
            
            import json
            summary = json.loads(response.choices[0].message.content)
            
            return {
                "pr_id": pr.pull_request_id,
                "pr_title": pr.title,
                "summary": summary.get("overall_summary", pr.title),
                "key_changes": summary.get("key_changes", []),
                "business_impact": summary.get("business_impact", ""),
                "technical_highlights": summary.get("technical_highlights", ""),
                "file_analyses": file_analyses,
                "overall_type": self._determine_overall_type(file_analyses),
                "overall_impact": self._determine_overall_impact(file_analyses)
            }
            
        except Exception as e:
            print(f"Error generating PR summary: {e}")
            return {
                "pr_id": pr.pull_request_id,
                "pr_title": pr.title,
                "summary": pr.title,
                "key_changes": [a["summary"] for a in file_analyses],
                "file_analyses": file_analyses,
                "overall_type": "other",
                "overall_impact": "medium"
            }

    def _determine_overall_type(self, analyses: List[Dict[str, Any]]) -> str:
        """Determine overall change type from file analyses"""
        types = [a.get("type", "other") for a in analyses]
        # Return most common type
        return max(set(types), key=types.count) if types else "other"

    def _determine_overall_impact(self, analyses: List[Dict[str, Any]]) -> str:
        """Determine overall impact from file analyses"""
        impacts = [a.get("impact", "medium") for a in analyses]
        # If any high impact, return high
        if "high" in impacts:
            return "high"
        elif "medium" in impacts:
            return "medium"
        else:
            return "low"
